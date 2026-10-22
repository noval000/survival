extends Node3D

# Deterministic island terrain. Real GLBs are loaded from res://assets/models
# when copied from the old prototype; the scene also runs without them.
const SIZE := 144.0
const CELLS := 96
const SEA_LEVEL := 0.0
const MODEL_PATHS := {
    "pine": "res://assets/models/trees/pine_01_lod0.glb",
    "spruce": "res://assets/models/trees/spruce_01_lod0.glb",
    "mountain": "res://assets/models/rocks/rocky_mountain_01.glb",
    "cliff": "res://assets/models/rocks/cliff_01.glb"
}
var terrain_noise := FastNoiseLite.new()
var detail_noise := FastNoiseLite.new()

func _ready() -> void:
    terrain_noise.seed = 17341
    terrain_noise.frequency = 0.022
    terrain_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
    terrain_noise.fractal_octaves = 4
    detail_noise.seed = 9921
    detail_noise.frequency = 0.09
    create_terrain()
    create_water()
    create_vegetation()
    create_rocks()
    create_grass()

func height_at(x: float, z: float) -> float:
    var r := Vector2(x, z).length()
    var coast := 1.0 - smoothstep(54.0, 72.0, r)
    var hills := maxf(0.0, 4.0 + terrain_noise.get_noise_2d(x, z) * 9.0)
    var details := detail_noise.get_noise_2d(x, z) * 0.65
    var spawn_flat := smoothstep(5.0, 19.0, r)
    return (hills * spawn_flat + details * spawn_flat) * coast - smoothstep(66.0, 75.0, r) * 2.5

func create_terrain() -> void:
    var vertices := PackedVector3Array()
    var colors := PackedColorArray()
    var normals := PackedVector3Array()
    var indices := PackedInt32Array()
    for z in range(CELLS + 1):
        for x in range(CELLS + 1):
            var wx := (float(x) / CELLS - 0.5) * SIZE
            var wz := (float(z) / CELLS - 0.5) * SIZE
            var h := height_at(wx, wz)
            vertices.append(Vector3(wx, h, wz))
            var sample_step: float = SIZE / float(CELLS)
            var dx: float = height_at(wx + sample_step, wz) - height_at(wx - sample_step, wz)
            var dz: float = height_at(wx, wz + sample_step) - height_at(wx, wz - sample_step)
            normals.append(Vector3(-dx, 2.0 * sample_step, -dz).normalized())
            var inland := 1.0 - smoothstep(49.0, 64.0, Vector2(wx, wz).length())
            var base := Color(0.67, 0.59, 0.42).lerp(Color(0.26, 0.39, 0.24), inland)
            colors.append(base.lerp(Color(0.39, 0.40, 0.38), smoothstep(4.5, 8.0, h)))
    for z in range(CELLS):
        for x in range(CELLS):
            var i := z * (CELLS + 1) + x
            indices.append_array(PackedInt32Array([i, i + CELLS + 1, i + 1, i + 1, i + CELLS + 1, i + CELLS + 2]))
    var arrays := []
    arrays.resize(Mesh.ARRAY_MAX)
    arrays[Mesh.ARRAY_VERTEX] = vertices
    arrays[Mesh.ARRAY_COLOR] = colors
    arrays[Mesh.ARRAY_NORMAL] = normals
    arrays[Mesh.ARRAY_INDEX] = indices
    var mesh := ArrayMesh.new()
    mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
    var material := StandardMaterial3D.new()
    material.vertex_color_use_as_albedo = true
    material.roughness = 1.0
    material.cull_mode = BaseMaterial3D.CULL_DISABLED
    mesh.surface_set_material(0, material)
    var terrain := MeshInstance3D.new()
    terrain.name = "IslandTerrain"
    terrain.mesh = mesh
    add_child(terrain)
    # HeightMapShape3D is a dedicated solid terrain collider, independent of
    # mesh triangle winding / backface settings on GL Compatibility.
    var terrain_shape := HeightMapShape3D.new()
    terrain_shape.map_width = CELLS + 1
    terrain_shape.map_depth = CELLS + 1
    var heights := PackedFloat32Array()
    for z in range(CELLS + 1):
        for x in range(CELLS + 1):
            heights.append(vertices[z * (CELLS + 1) + x].y)
    terrain_shape.map_data = heights
    var body := StaticBody3D.new()
    body.name = "TerrainCollision"
    body.scale = Vector3(SIZE / float(CELLS), 1.0, SIZE / float(CELLS))
    var shape := CollisionShape3D.new()
    shape.shape = terrain_shape
    body.add_child(shape)
    add_child(body)

func create_water() -> void:
    # Subdivisions allow the low-cost vertex shader to animate gentle waves.
    var plane := PlaneMesh.new()
    plane.size = Vector2(450.0, 450.0)
    plane.subdivide_width = 100
    plane.subdivide_depth = 100
    var water := MeshInstance3D.new()
    water.name = "Sea"
    water.mesh = plane
    water.position.y = SEA_LEVEL - 0.35
    var ocean_shader: Shader = load("res://shaders/ocean.gdshader") as Shader
    if ocean_shader != null:
        var ocean_material := ShaderMaterial.new()
        ocean_material.shader = ocean_shader
        water.material_override = ocean_material
    else:
        var fallback := StandardMaterial3D.new()
        fallback.albedo_color = Color(0.07, 0.33, 0.46)
        fallback.roughness = 0.25
        water.material_override = fallback
    add_child(water)

# Reuse one imported GLB resource per tree type instead of reloading on each spawn.
# Procedural trees are an intentionally lightweight fallback when heavy Meshy
# assets are absent or disabled due to editor crashes.
var model_cache: Dictionary = {}
var lod_trees: Array[Dictionary] = []
var lod_player: Node3D
var lod_elapsed: float = 0.0

func _process(delta: float) -> void:
    lod_elapsed += delta
    if lod_elapsed < 0.35:
        return
    lod_elapsed = 0.0
    if lod_player == null:
        lod_player = get_node_or_null("../Player") as Node3D
    if lod_player == null:
        return
    for entry in lod_trees:
        var near_tree: Node3D = entry["near"]
        var far_tree: Node3D = entry["far"]
        var distance_squared: float = lod_player.global_position.distance_squared_to(near_tree.global_position)
        var use_far: bool = distance_squared > 35.0 * 35.0
        near_tree.visible = not use_far
        far_tree.visible = use_far

func create_vegetation() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 77531
    for i in range(90):
        var x: float = rng.randf_range(-61.0, 61.0)
        var z: float = rng.randf_range(-61.0, 61.0)
        var distance: float = Vector2(x, z).length()
        if distance < 18.0 or distance > 59.0:
            continue
        var kind: String = "pine" if rng.randf() < 0.6 else "spruce"
        var tree: Node3D = instantiate_model(kind)
        if tree == null:
            tree = make_fallback_tree(rng)
        else:
            var target_height: float = rng.randf_range(5.5, 8.5)
            fit_model_height(tree, target_height)
            tree.set_meta("trunk_height", target_height)
        tree.position = Vector3(x, height_at(x, z) - 0.12, z)
        tree.rotation.y = rng.randf_range(0.0, TAU)
        add_child(tree)
        if tree.has_meta("trunk_height"):
            add_tree_collision(tree, float(tree.get_meta("trunk_height")))
        if tree.has_meta("trunk_height"):
            var far_tree: Node3D = instantiate_tree_lod(kind, 2)
            if far_tree != null:
                # Both variants must share exactly the same world-space bounds.
                var tree_height: float = float(tree.get_meta("target_height", 7.0))
                fit_model_height(far_tree, tree_height)
                far_tree.position = tree.position
                far_tree.rotation = tree.rotation
                far_tree.visible = false
                add_child(far_tree)
                lod_trees.append({"near": tree, "far": far_tree})
    for point in [Vector2(-38.0, -34.0), Vector2(41.0, -38.0)]:
        var mountain: Node3D = instantiate_model("mountain")
        if mountain != null:
            mountain.position = Vector3(point.x, height_at(point.x, point.y) - 1.0, point.y)
            fit_model_height(mountain, 13.0)
            add_child(mountain)

func make_fallback_tree(rng: RandomNumberGenerator) -> Node3D:
    var root := Node3D.new()
    root.name = "Pine"
    var trunk_height: float = rng.randf_range(3.8, 5.8)
    var trunk_mesh := CylinderMesh.new()
    trunk_mesh.top_radius = 0.16
    trunk_mesh.bottom_radius = 0.28
    trunk_mesh.height = trunk_height
    var bark := StandardMaterial3D.new()
    bark.albedo_color = Color(0.31, 0.21, 0.13)
    bark.roughness = 1.0
    var trunk := MeshInstance3D.new()
    trunk.mesh = trunk_mesh
    trunk.material_override = bark
    trunk.position.y = trunk_height * 0.5
    root.add_child(trunk)
    var needles := StandardMaterial3D.new()
    needles.albedo_color = Color(0.13 + rng.randf_range(0.0, 0.07), 0.24, 0.16)
    needles.roughness = 1.0
    for level in range(3):
        var crown_mesh := CylinderMesh.new()
        crown_mesh.top_radius = 0.0
        crown_mesh.bottom_radius = 1.5 - float(level) * 0.28
        crown_mesh.height = 2.7
        var crown := MeshInstance3D.new()
        crown.mesh = crown_mesh
        crown.material_override = needles
        crown.position.y = trunk_height * 0.52 + float(level) * 1.08
        root.add_child(crown)
    var trunk_body := StaticBody3D.new()
    var trunk_shape := CollisionShape3D.new()
    var cylinder := CylinderShape3D.new()
    cylinder.radius = 0.29
    cylinder.height = trunk_height
    trunk_shape.shape = cylinder
    trunk_shape.position.y = trunk_height * 0.5
    trunk_body.add_child(trunk_shape)
    root.add_child(trunk_body)
    return root

func create_rocks() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 14298
    var rock_material := StandardMaterial3D.new()
    rock_material.albedo_color = Color(0.37, 0.39, 0.37)
    rock_material.roughness = 1.0
    for i in range(75):
        var x: float = rng.randf_range(-63.0, 63.0)
        var z: float = rng.randf_range(-63.0, 63.0)
        var r: float = Vector2(x, z).length()
        if r < 16.0 or r > 62.0:
            continue
        var size: float = rng.randf_range(0.55, 2.2)
        var mesh := SphereMesh.new()
        mesh.radius = 1.0
        mesh.height = 2.0
        mesh.radial_segments = 8
        mesh.rings = 4
        var rock := MeshInstance3D.new()
        rock.name = "Rock"
        rock.mesh = mesh
        rock.material_override = rock_material
        rock.scale = Vector3(size, size * 0.62, size * 0.85)
        rock.position = Vector3(x, height_at(x, z) + size * 0.17, z)
        add_child(rock)
        var body := StaticBody3D.new()
        body.position = rock.position
        var shape := CollisionShape3D.new()
        var sphere := SphereShape3D.new()
        sphere.radius = size * 0.7
        shape.shape = sphere
        body.add_child(shape)
        add_child(body)

func instantiate_model(kind: String) -> Node3D:
    var path: String = MODEL_PATHS[kind]
    if not ResourceLoader.exists(path):
        return null
    if not model_cache.has(path):
        model_cache[path] = load(path) as PackedScene
    var scene: PackedScene = model_cache[path] as PackedScene
    if scene == null:
        return null
    return scene.instantiate() as Node3D

# Meshy exports often have arbitrary units/pivots. Normalize based on the
# actual mesh bounds (including nested node transforms) before placement.
# Local transforms are available before a node enters the scene tree.
# Never access global_transform while normalizing imported PackedScenes.
func collect_mesh_bounds(node: Node, parent_transform: Transform3D, result: Array[AABB]) -> void:
    var current_transform: Transform3D = parent_transform
    if node is Node3D:
        current_transform = parent_transform * (node as Node3D).transform
    if node is MeshInstance3D:
        var part: MeshInstance3D = node as MeshInstance3D
        if part.mesh != null:
            result.append(current_transform * part.get_aabb())
    for child in node.get_children():
        collect_mesh_bounds(child, current_transform, result)

func fit_model_height(model: Node3D, target_height: float) -> void:
    var boxes: Array[AABB] = []
    for child in model.get_children():
        collect_mesh_bounds(child, Transform3D.IDENTITY, boxes)
    if boxes.is_empty():
        return
    var bounds: AABB = boxes[0]
    for i in range(1, boxes.size()):
        bounds = bounds.merge(boxes[i])
    if bounds.size.y < 0.001:
        return
    var factor: float = target_height / bounds.size.y
    # Keep the imported scene hierarchy and ownership untouched.
    # The offset is in original model units, before scaling.
    for child in model.get_children():
        if child is Node3D:
            var spatial_child: Node3D = child as Node3D
            spatial_child.position -= Vector3(bounds.get_center().x, bounds.position.y, bounds.get_center().z)
    model.scale = Vector3.ONE * factor
    model.set_meta("target_height", target_height)

func add_tree_collision(tree: Node3D, tree_height: float) -> void:
    # Independent sibling collider: never hide physics when the visual LOD
    # switches to a distant mesh.
    var body := StaticBody3D.new()
    body.name = "TrunkCollision"
    body.position = tree.position
    body.rotation = tree.rotation
    var shape := CollisionShape3D.new()
    var trunk := CylinderShape3D.new()
    trunk.radius = clampf(tree_height * 0.055, 0.28, 0.52)
    trunk.height = tree_height * 0.72
    shape.shape = trunk
    shape.position.y = trunk.height * 0.5
    body.add_child(shape)
    add_child(body)

# A single MultiMesh draw call for scattered grass, keeping the island
# inexpensive on integrated graphics / the GL Compatibility renderer.
func create_grass() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 24813
    var blade := QuadMesh.new()
    blade.size = Vector2(0.22, 0.64)
    var grass_material := StandardMaterial3D.new()
    grass_material.albedo_color = Color(0.31, 0.46, 0.22)
    grass_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    grass_material.cull_mode = BaseMaterial3D.CULL_DISABLED
    blade.material = grass_material
    var transforms: Array[Transform3D] = []
    for i in range(4500):
        var x: float = rng.randf_range(-61.0, 61.0)
        var z: float = rng.randf_range(-61.0, 61.0)
        var radius: float = Vector2(x, z).length()
        if radius < 9.0 or radius > 53.0:
            continue
        var h: float = height_at(x, z)
        if h < 0.4:
            continue
        var yaw: float = rng.randf_range(0.0, TAU)
        var scale_factor: float = rng.randf_range(0.55, 1.25)
        var basis := Basis(Vector3.UP, yaw).scaled(Vector3(scale_factor, scale_factor, scale_factor))
        transforms.append(Transform3D(basis, Vector3(x, h + 0.26 * scale_factor, z)))
    var multimesh := MultiMesh.new()
    multimesh.transform_format = MultiMesh.TRANSFORM_3D
    multimesh.mesh = blade
    multimesh.instance_count = transforms.size()
    for i in range(transforms.size()):
        multimesh.set_instance_transform(i, transforms[i])
    var grass := MultiMeshInstance3D.new()
    grass.name = "InstancedGrass"
    grass.multimesh = multimesh
    add_child(grass)

# Optional distance LOD: use imported LOD2 only when the corresponding GLB
# exists. Never load a missing model and never duplicate physics colliders.
func instantiate_tree_lod(kind: String, level: int) -> Node3D:
    var path: String = "res://assets/models/trees/%s_01_lod%d.glb" % [kind, level]
    if not ResourceLoader.exists(path):
        return null
    if not model_cache.has(path):
        model_cache[path] = load(path) as PackedScene
    var scene: PackedScene = model_cache[path] as PackedScene
    if scene == null:
        return null
    return scene.instantiate() as Node3D
