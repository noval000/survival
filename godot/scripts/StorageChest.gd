extends StaticBody3D

const STACKS = preload("res://scripts/InventoryStacks.gd")
const TRANSFER = preload("res://scripts/ContainerTransfer.gd")

var storage = STACKS.new()
var chest_id := ""
var owner_player: Node

func _ready() -> void:
    name = "StorageChest"
    collision_layer = 1
    collision_mask = 1
    add_to_group("survival_chests")
    var body_mesh := BoxMesh.new()
    body_mesh.size = Vector3(1.25, 0.85, 0.8)
    var mesh := MeshInstance3D.new()
    mesh.mesh = body_mesh
    var wood := StandardMaterial3D.new()
    wood.albedo_color = Color(0.36, 0.23, 0.13)
    mesh.material_override = wood
    add_child(mesh)
    var lid_mesh := BoxMesh.new()
    lid_mesh.size = Vector3(1.35, 0.15, 0.9)
    var lid := MeshInstance3D.new()
    lid.mesh = lid_mesh
    lid.position.y = 0.48
    lid.material_override = wood
    add_child(lid)
    var collider := CollisionShape3D.new()
    var box := BoxShape3D.new()
    box.size = Vector3(1.35, 1.05, 0.9)
    collider.shape = box
    collider.position.y = 0.1
    add_child(collider)

func deposit(player_bag, bag_index: int, amount: int = -1) -> bool:
    return TRANSFER.transfer(player_bag, storage, bag_index, amount)

func withdraw(player_bag, chest_index: int, amount: int = -1) -> bool:
    return TRANSFER.transfer(storage, player_bag, chest_index, amount)

func serialize() -> Dictionary:
    return {
        "id": chest_id,
        "position": [global_position.x, global_position.y, global_position.z],
        "rotation_y": rotation.y,
        "items": storage.serialize()
    }

func restore(data: Dictionary) -> bool:
    var items: Array = data.get("items", [])
    return storage.restore(items)
