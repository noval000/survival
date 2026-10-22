extends Node3D

# Deterministic island terrain. Real GLBs are loaded from res://assets/models
# when copied from the old prototype; the scene also runs without them.
const SIZE := 144.0
const CELLS := 96
const SEA_LEVEL := 0.0
const MODEL_PATHS := {
    "pine": "res://assets/models/trees/pine_01_lod0.glb",
    "spruce": "res://assets/models/trees/spruce_01_lod0.glb",
    "mountain": "res://assets/models/rocky_mountain_01.glb",
    "cliff": "res://assets/models/cliff_01.glb"
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
    var indices := PackedInt32Array()
    for z in range(CELLS + 1):
        for x in range(CELLS + 1):
            var wx := (float(x) / CELLS - 0.5) * SIZE
            var wz := (float(z) / CELLS - 0.5) * SIZE
            var h := height_at(wx, wz)
            vertices.append(Vector3(wx, h, wz))
            var beach := 1.0 - smoothstep(52.0, 65.0, Vector2(wx, wz).length())
            var base := Color(0.53, 0.48, 0.34).lerp(Color(0.26, 0.37, 0.23), beach)
            colors.append(base.lerp(Color(0.39, 0.40, 0.38), smoothstep(4.5, 8.0, h)))
    for z in range(CELLS):
        for x in range(CELLS):
            var i := z * (CELLS + 1) + x
            indices.append_array(PackedInt32Array([i, i + CELLS + 1, i + 1, i + 1, i + CELLS + 1, i + CELLS + 2]))
    var arrays := []
    arrays.resize(Mesh.ARRAY_MAX)
    arrays[Mesh.ARRAY_VERTEX] = vertices
    arrays[Mesh.ARRAY_COLOR] = colors
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
    var body := StaticBody3D.new()
    body.name = "TerrainCollision"
    var shape := CollisionShape3D.new()
    shape.shape = mesh.create_trimesh_shape()
    body.add_child(shape)
    add_child(body)

func create_water() -> void:
    var plane := PlaneMesh.new()
    plane.size = Vector2(450.0, 450.0)
    var water := MeshInstance3D.new()
    water.name = "Sea"
    water.mesh = plane
    water.position.y = SEA_LEVEL - 0.35
    var material := StandardMaterial3D.new()
    material.albedo_color = Color(0.07, 0.33, 0.46, 0.84)
    material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
    material.roughness = 0.24
    water.material_override = material
    add_child(water)

func create_vegetation() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 77531
    for i in range(65):
        var x := rng.randf_range(-61.0, 61.0)
        var z := rng.randf_range(-61.0, 61.0)
        var distance := Vector2(x, z).length()
        if distance < 19.0 or distance > 58.0:
            continue
        var kind := "pine" if rng.randf() < 0.6 else "spruce"
        var tree := instantiate_model(kind)
        if tree == null:
            continue
        tree.position = Vector3(x, height_at(x, z) - 0.15, z)
        tree.rotation.y = rng.randf_range(0.0, TAU)
        tree.scale = Vector3.ONE * rng.randf_range(3.0, 5.0)
        add_child(tree)
    for point in [Vector2(-38.0, -34.0), Vector2(41.0, -38.0)]:
        var mountain := instantiate_model("mountain")
        if mountain != null:
            mountain.position = Vector3(point.x, height_at(point.x, point.y) - 1.0, point.y)
            mountain.scale = Vector3.ONE * 9.0
            add_child(mountain)

func instantiate_model(kind: String) -> Node3D:
    var path: String = MODEL_PATHS[kind]
    if not ResourceLoader.exists(path):
        return null
    var scene := load(path) as PackedScene
    if scene == null:
        return null
    return scene.instantiate() as Node3D
