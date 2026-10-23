extends "res://scripts/StorageChest.gd"

# Reusable loot container. Contents are rolled on first spawn and refill after cooldown.
const RESPAWN_SECONDS := 300.0
const LOOT_TABLE := [
    {"kind": "wood", "min": 10, "max": 35, "weight": 35},
    {"kind": "stone", "min": 8, "max": 25, "weight": 30},
    {"kind": "iron", "min": 3, "max": 12, "weight": 18},
    {"kind": "coal", "min": 4, "max": 15, "weight": 12},
    {"kind": "bandage", "min": 1, "max": 3, "weight": 5}
]

var respawn_remaining := 0.0
var spawn_initialized := false
var loot_seed := 0

func _ready() -> void:
    super._ready()
    name = "LootCrate"
    add_to_group("survival_loot")
    if not spawn_initialized:
        refill()

func _process(delta: float) -> void:
    if storage.count("wood") + storage.count("stone") + storage.count("iron") + storage.count("coal") + storage.count("bandage") > 0:
        respawn_remaining = RESPAWN_SECONDS
        return
    if respawn_remaining > 0.0:
        respawn_remaining -= delta
        if respawn_remaining <= 0.0:
            refill()

func refill() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = int(loot_seed) if loot_seed != 0 else int(Time.get_ticks_usec())
    storage = STACKS.new()
    for roll in range(3):
        var ticket: int = rng.randi_range(1, 100)
        var cumulative := 0
        for entry in LOOT_TABLE:
            cumulative += int(entry["weight"])
            if ticket <= cumulative:
                storage.add(str(entry["kind"]), rng.randi_range(int(entry["min"]), int(entry["max"])))
                break
    loot_seed = int(rng.randi())
    respawn_remaining = RESPAWN_SECONDS
    spawn_initialized = true

func serialize() -> Dictionary:
    var result: Dictionary = super.serialize()
    result["respawn_remaining"] = respawn_remaining
    result["loot_seed"] = loot_seed
    return result

func restore(data: Dictionary) -> bool:
    if not super.restore(data):
        return false
    respawn_remaining = maxf(0.0, float(data.get("respawn_remaining", RESPAWN_SECONDS)))
    loot_seed = int(data.get("loot_seed", 0))
    spawn_initialized = true
    return true
