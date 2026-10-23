extends SceneTree

const LOOT = preload("res://scripts/LootCrate.gd")

func _initialize() -> void:
    var crate = LOOT.new()
    crate.loot_seed = 42
    crate.refill()
    var first: Array = crate.storage.serialize()
    assert(crate.storage.count("wood") + crate.storage.count("stone") + crate.storage.count("iron") + crate.storage.count("coal") + crate.storage.count("bandage") > 0)
    assert(first.size() == 24)
    var saved: Dictionary = crate.serialize()
    var restored = LOOT.new()
    assert(restored.restore(saved))
    assert(restored.storage.serialize() == first)
    assert(restored.respawn_remaining == crate.respawn_remaining)
    print("LootCrate: OK")
    quit()
