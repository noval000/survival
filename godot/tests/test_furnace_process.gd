extends SceneTree

const PROCESS = preload("res://scripts/FurnaceProcess.gd")

func _initialize() -> void:
    var furnace = PROCESS.new()
    assert(furnace.storage.add("iron", 9) == 0)
    assert(furnace.storage.add("coal", 6) == 0)
    assert(furnace.can_smelt())
    furnace.active = true
    assert(furnace.tick(4.0) == 0)
    assert(is_equal_approx(furnace.progress, 4.0))
    var saved: Dictionary = furnace.serialize()
    var restored = PROCESS.new()
    assert(restored.restore(saved))
    assert(is_equal_approx(restored.progress, 4.0))
    assert(restored.tick(4.0) == 1)
    assert(restored.storage.count("iron_bar") == 1)
    assert(restored.storage.count("iron") == 6)
    assert(restored.storage.count("coal") == 4)
    assert(restored.tick(16.0) == 2)
    assert(restored.storage.count("iron_bar") == 3)
    assert(not restored.active)
    assert(not restored.can_smelt())
    print("FurnaceProcess: OK")
    quit()
