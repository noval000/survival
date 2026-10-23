extends Node3D

# Grid-snapped construction with material costs and persistent physics.
const GRID := 3.0
const COSTS := {
    "foundation": {"wood": 20, "stone": 10},
    "wall": {"plank": 4},
    "doorway": {"plank": 3},
    "roof": {"plank": 6}
}
const SIZES := {
    "foundation": Vector3(3.0, 0.25, 3.0),
    "wall": Vector3(3.0, 2.8, 0.20),
    "doorway": Vector3(3.0, 2.8, 0.20),
    "roof": Vector3(3.0, 0.22, 3.0)
}
var player: CharacterBody3D
var camera: Camera3D
var world: Node3D
var active := false
var piece_type := "foundation"
var rotation_step := 0
var ghost: MeshInstance3D
var ghost_valid := false
var preview_position := Vector3.ZERO
var placed: Array[Dictionary] = []
var green := StandardMaterial3D.new()
var red := StandardMaterial3D.new()

func configure(p: CharacterBody3D, cam: Camera3D, island: Node3D) -> void:
    player = p
    camera = cam
    world = island

func _ready() -> void:
    green.albedo_color = Color(0.12, 0.90, 0.34, 0.45)
    red.albedo_color = Color(0.95, 0.15, 0.14, 0.45)
    green.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
    red.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
    green.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    red.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    ghost = MeshInstance3D.new()
    ghost.name = "BuildPreview"
    ghost.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
    add_child(ghost)
    set_active(false)

func set_active(value: bool) -> void:
    active = value
    if ghost != null:
        ghost.visible = active
    if active:
        refresh_preview()

func choose_piece(kind: String) -> void:
    if not COSTS.has(kind):
        return
    piece_type = kind
    refresh_preview()

func rotate_piece() -> void:
    rotation_step = (rotation_step + 1) % 4
    refresh_preview()

func refresh_preview() -> void:
    if ghost == null:
        return
    var mesh := BoxMesh.new()
    mesh.size = SIZES[piece_type]
    ghost.mesh = mesh

func _physics_process(_delta: float) -> void:
    if not active or camera == null or world == null:
        return
    var ray := PhysicsRayQueryParameters3D.create(camera.global_position, camera.global_position - camera.global_transform.basis.z * 9.0)
    ray.exclude = [player.get_rid()]
    var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(ray)
    ghost_valid = false
    if hit.is_empty():
        ghost.visible = false
        return
    ghost.visible = true
    var location: Vector3 = hit["position"]
    var collider: Node = hit.get("collider") as Node
    var selected_foundation: Dictionary = {}
    var nearest_distance := 2.3
    for item in placed:
        if item["type"] != "foundation":
            continue
        var p: Vector3 = item["position"]
        var distance: float = Vector2(location.x - p.x, location.z - p.z).length()
        if distance < nearest_distance:
            nearest_distance = distance
            selected_foundation = item
    if piece_type == "foundation":
        var cell_x: float = roundf(location.x / GRID) * GRID
        var cell_z: float = roundf(location.z / GRID) * GRID
        if not selected_foundation.is_empty() and collider != null and collider.name.begins_with("Built_foundation"):
            var origin: Vector3 = selected_foundation["position"]
            var offset: Vector3 = location - origin
            if absf(offset.x) > absf(offset.z):
                cell_x = origin.x + signf(offset.x) * GRID
                cell_z = origin.z
            else:
                cell_x = origin.x
                cell_z = origin.z + signf(offset.z) * GRID
        var foundation_y: float = float(world.call("height_at", cell_x, cell_z)) + 0.15
        if not selected_foundation.is_empty():
            var parent_position: Vector3 = selected_foundation["position"]
            if absf(parent_position.x - cell_x) + absf(parent_position.z - cell_z) < GRID + 0.1:
                foundation_y = parent_position.y
        preview_position = Vector3(cell_x, foundation_y, cell_z)
    else:
        if selected_foundation.is_empty():
            ghost.visible = false
            return
        var center: Vector3 = selected_foundation["position"]
        if piece_type == "roof":
            preview_position = center + Vector3(0.0, 2.95, 0.0)
        else:
            var dx: float = location.x - center.x
            var dz: float = location.z - center.z
            var edge := rotation_step % 4
            if absf(dx) + absf(dz) > 0.15:
                if absf(dx) > absf(dz):
                    edge = 1 if dx > 0.0 else 3
                else:
                    edge = 2 if dz > 0.0 else 0
            rotation_step = edge
            var offset := Vector3.ZERO
            if edge == 0:
                offset.z = -GRID * 0.5
            elif edge == 1:
                offset.x = GRID * 0.5
            elif edge == 2:
                offset.z = GRID * 0.5
            else:
                offset.x = -GRID * 0.5
            preview_position = center + offset + Vector3(0.0, 1.52, 0.0)
    ghost.global_position = preview_position
    ghost.rotation.y = float(rotation_step) * PI * 0.5
    var free_slot := true
    for item in placed:
        var previous: Vector3 = item["position"]
        if previous.distance_to(preview_position) < 0.12:
            if piece_type in ["wall", "doorway"] and item["type"] in ["wall", "doorway"]:
                free_slot = false
            elif item["type"] == piece_type:
                free_slot = false
    ghost_valid = free_slot and player.global_position.distance_to(preview_position) <= 9.0
    ghost.material_override = green if ghost_valid else red

func place_piece(resources: Dictionary) -> bool:
    if not active or not ghost_valid:
        return false
    var cost: Dictionary = COSTS[piece_type]
    for material in cost:
        if int(resources.get(material, 0)) < int(cost[material]):
            return false
    for material in cost:
        resources[material] = int(resources.get(material, 0)) - int(cost[material])
    var body := StaticBody3D.new()
    body.name = "Built_" + piece_type
    body.collision_layer = 1
    body.collision_mask = 1
    add_child(body)
    body.global_position = preview_position
    body.rotation.y = float(rotation_step) * PI * 0.5
    var mesh := BoxMesh.new()
    mesh.size = SIZES[piece_type]
    var view := MeshInstance3D.new()
    view.mesh = mesh
    var material := StandardMaterial3D.new()
    material.albedo_color = Color(0.39, 0.27, 0.16) if piece_type != "foundation" else Color(0.42, 0.41, 0.37)
    view.material_override = material
    if piece_type != "doorway":
        body.add_child(view)
    else:
        for side in [-1.0, 1.0]:
            var post := MeshInstance3D.new()
            var post_mesh := BoxMesh.new()
            post_mesh.size = Vector3(0.52, 2.8, 0.20)
            post.mesh = post_mesh
            post.material_override = material
            post.position.x = side * 1.24
            body.add_child(post)
            var post_shape := CollisionShape3D.new()
            var post_box := BoxShape3D.new()
            post_box.size = post_mesh.size
            post_shape.shape = post_box
            post_shape.position = post.position
            body.add_child(post_shape)
        var lintel := MeshInstance3D.new()
        var lintel_mesh := BoxMesh.new()
        lintel_mesh.size = Vector3(3.0, 0.48, 0.20)
        lintel.mesh = lintel_mesh
        lintel.material_override = material
        lintel.position.y = 1.16
        body.add_child(lintel)
        var lintel_shape := CollisionShape3D.new()
        var lintel_box := BoxShape3D.new()
        lintel_box.size = lintel_mesh.size
        lintel_shape.shape = lintel_box
        lintel_shape.position = lintel.position
        body.add_child(lintel_shape)
    if piece_type != "doorway":
        var collider := CollisionShape3D.new()
        var shape := BoxShape3D.new()
        shape.size = SIZES[piece_type]
        collider.shape = shape
        body.add_child(collider)
    placed.append({"type": piece_type, "position": preview_position, "rotation": rotation_step})
    return true

func restore_structures(structures: Array) -> void:
    var previous_active: bool = active
    var previous_type: String = piece_type
    var previous_rotation: int = rotation_step
    var previous_position: Vector3 = preview_position
    for record in structures:
        if typeof(record) != TYPE_DICTIONARY:
            continue
        var kind: String = str(record.get("type", ""))
        var coords: Array = record.get("position", [])
        if not COSTS.has(kind) or coords.size() != 3:
            continue
        piece_type = kind
        rotation_step = posmod(int(record.get("rotation", 0)), 4)
        preview_position = Vector3(float(coords[0]), float(coords[1]), float(coords[2]))
        ghost_valid = true
        active = true
        var free_materials: Dictionary = {"wood": 999999, "stone": 999999, "plank": 999999}
        place_piece(free_materials)
    active = previous_active
    piece_type = previous_type
    rotation_step = previous_rotation
    preview_position = previous_position
    refresh_preview()
    set_active(previous_active)
