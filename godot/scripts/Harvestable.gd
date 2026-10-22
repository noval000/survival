extends StaticBody3D

# Harvestable resource with a stable world collider and simple health model.
@export_enum("wood", "stone") var resource_type: String = "wood"
@export var max_health: int = 100
@export var yield_amount: int = 20
var health: int = 100
var depleted: bool = false

func _ready() -> void:
    health = max_health
    add_to_group("harvestable")

func harvest(tool: String, damage: int) -> Dictionary:
    if depleted:
        return {}
    if resource_type == "wood" and tool != "axe":
        return {}
    if resource_type == "stone" and tool != "pickaxe":
        return {}
    health = maxi(0, health - damage)
    if health == 0:
        depleted = true
        visible = false
        collision_layer = 0
        collision_mask = 0
        return {resource_type: yield_amount}
    return {resource_type: maxi(1, yield_amount / 5)}
