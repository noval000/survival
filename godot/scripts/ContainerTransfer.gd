extends RefCounted

# Atomic transfers between two stack inventories (backpack and chest).
# Uses InventoryStacks for both inventories; no item is lost on failure.
const STACKS = preload("res://scripts/InventoryStacks.gd")

static func transfer(source, destination, source_index: int, quantity: int = -1) -> bool:
    if source == null or destination == null or source == destination:
        return false
    if source_index < 0 or source_index >= source.slots.size():
        return false
    var entry: Dictionary = source.slots[source_index]
    if entry.is_empty():
        return false
    var kind: String = str(entry.get("kind", ""))
    var available: int = int(entry.get("count", 0))
    var amount: int = available if quantity < 0 else mini(quantity, available)
    if amount <= 0 or not destination.can_fit(kind, amount):
        return false
    var left: int = destination.add(kind, amount)
    if left != 0:
        return false
    var remaining: int = available - amount
    source.slots[source_index] = {} if remaining == 0 else {"kind": kind, "count": remaining}
    return true

static func transfer_kind(source, destination, kind: String, quantity: int) -> bool:
    if source == null or destination == null or quantity <= 0:
        return false
    if source.count(kind) < quantity or not destination.can_fit(kind, quantity):
        return false
    var remainder: int = destination.add(kind, quantity)
    if remainder != 0:
        return false
    return source.remove(kind, quantity)
