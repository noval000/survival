extends StaticBody3D

const PROCESS = preload("res://scripts/FurnaceProcess.gd")
var furnace_id := ""
var process = PROCESS.new()

func _ready() -> void:
    name = "SmeltingFurnace"
    collision_layer = 1
    add_to_group("survival_furnaces")
    var mesh := MeshInstance3D.new()
    var cylinder := CylinderMesh.new()
    cylinder.top_radius = 0.5
    cylinder.bottom_radius = 0.65
    cylinder.height = 1.2
    mesh.mesh = cylinder
    add_child(mesh)
    var collider := CollisionShape3D.new()
    var shape := CylinderShape3D.new()
    shape.radius = 0.65
    shape.height = 1.2
    collider.shape = shape
    add_child(collider)

func _process(delta: float) -> void:
    process.tick(delta)

func toggle() -> bool:
    process.active = not process.active and process.can_smelt()
    return process.active

func serialize() -> Dictionary:
    return {"id": furnace_id, "position": [global_position.x, global_position.y, global_position.z], "rotation_y": rotation.y, "process": process.serialize()}

func restore(data: Dictionary) -> bool:
    return process.restore(data.get("process", {}))
