extends RefCounted

# Furnace simulation independent of scene and UI. Each batch costs 3 ore + 2 coal.
const STACKS = preload("res://scripts/InventoryStacks.gd")
const ORE_PER_BAR := 3
const COAL_PER_BAR := 2
const SECONDS_PER_BAR := 8.0

var storage = STACKS.new()
var active := false
var progress := 0.0

func can_smelt() -> bool:
    if storage.count("iron") < ORE_PER_BAR or storage.count("coal") < COAL_PER_BAR:
        return false
    var preview = STACKS.new()
    if not preview.restore(storage.serialize()):
        return false
    if not preview.remove("iron", ORE_PER_BAR) or not preview.remove("coal", COAL_PER_BAR):
        return false
    return preview.can_fit("iron_bar", 1)

func tick(delta: float) -> int:
    if not active or delta <= 0.0:
        return 0
    var produced := 0
    var remaining: float = delta
    while remaining > 0.0 and can_smelt():
        var step: float = minf(remaining, SECONDS_PER_BAR - progress)
        progress += step
        remaining -= step
        if progress >= SECONDS_PER_BAR - 0.00001:
            storage.remove("iron", ORE_PER_BAR)
            storage.remove("coal", COAL_PER_BAR)
            storage.add("iron_bar", 1)
            produced += 1
            progress = 0.0
    if not can_smelt():
        active = false
        progress = 0.0
    return produced

func serialize() -> Dictionary:
    return {"items": storage.serialize(), "active": active, "progress": progress}

func restore(data: Dictionary) -> bool:
    if not storage.restore(data.get("items", [])):
        return false
    active = bool(data.get("active", false))
    progress = clampf(float(data.get("progress", 0.0)), 0.0, SECONDS_PER_BAR - 0.0001)
    if not can_smelt():
        active = false
        progress = 0.0
    return true
