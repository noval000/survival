extends RefCounted

# Склад предметов: независимая от интерфейса модель с ограниченными стеками.
const CAPACITY := 24
const MAX_STACK := 100
const VALID_ITEMS := ["wood", "stone", "iron", "coal", "iron_bar", "berries", "bandage", "axe", "pickaxe"]

var slots: Array[Dictionary] = []

func _init() -> void:
    for i in range(CAPACITY):
        slots.append({})

func count(kind: String) -> int:
    var total := 0
    for slot in slots:
        if str(slot.get("kind", "")) == kind:
            total += int(slot.get("count", 0))
    return total

func add(kind: String, amount: int) -> int:
    if kind not in VALID_ITEMS or amount <= 0:
        return amount
    var remaining := amount
    var cap := 1 if kind in ["axe", "pickaxe"] else MAX_STACK
    for slot in slots:
        if str(slot.get("kind", "")) == kind and int(slot.get("count", 0)) < cap:
            var delta: int = mini(remaining, cap - int(slot["count"]))
            slot["count"] = int(slot["count"]) + delta
            remaining -= delta
            if remaining == 0:
                return 0
    for i in range(slots.size()):
        if slots[i].is_empty():
            var delta: int = mini(remaining, cap)
            slots[i] = {"kind": kind, "count": delta}
            remaining -= delta
            if remaining == 0:
                return 0
    return remaining

func remove(kind: String, amount: int) -> bool:
    if amount < 0 or count(kind) < amount:
        return false
    var remaining := amount
    for i in range(slots.size() - 1, -1, -1):
        if str(slots[i].get("kind", "")) != kind:
            continue
        var taken: int = mini(remaining, int(slots[i]["count"]))
        slots[i]["count"] = int(slots[i]["count"]) - taken
        remaining -= taken
        if int(slots[i]["count"]) == 0:
            slots[i] = {}
        if remaining == 0:
            break
    return true

func move(source: int, destination: int, amount: int = -1) -> bool:
    if source < 0 or destination < 0 or source >= CAPACITY or destination >= CAPACITY or source == destination:
        return false
    var from: Dictionary = slots[source]
    if from.is_empty():
        return false
    var quantity: int = int(from["count"])
    var moved: int = quantity if amount < 0 else mini(quantity, amount)
    if moved <= 0:
        return false
    var to: Dictionary = slots[destination]
    var kind: String = str(from["kind"])
    if not to.is_empty() and str(to["kind"]) != kind:
        if moved != quantity:
            return false
        slots[source] = to
        slots[destination] = from
        return true
    var cap := 1 if kind in ["axe", "pickaxe"] else MAX_STACK
    var free: int = cap - int(to.get("count", 0))
    moved = mini(moved, free)
    if moved <= 0:
        return false
    slots[destination] = {"kind": kind, "count": int(to.get("count", 0)) + moved}
    quantity -= moved
    slots[source] = {} if quantity == 0 else {"kind": kind, "count": quantity}
    return true

func split(source: int, destination: int) -> bool:
    if source < 0 or source >= CAPACITY or int(slots[source].get("count", 0)) < 2:
        return false
    return move(source, destination, int(floor(float(slots[source]["count"]) / 2.0)))

func serialize() -> Array:
    return slots.duplicate(true)

func restore(data: Array) -> bool:
    if data.size() != CAPACITY:
        return false
    var validated: Array[Dictionary] = []
    for entry in data:
        if typeof(entry) != TYPE_DICTIONARY:
            return false
        var slot: Dictionary = entry
        if slot.is_empty():
            validated.append({})
            continue
        var kind := str(slot.get("kind", ""))
        var count_value := int(slot.get("count", 0))
        var cap := 1 if kind in ["axe", "pickaxe"] else MAX_STACK
        if kind not in VALID_ITEMS or count_value < 1 or count_value > cap:
            return false
        validated.append({"kind": kind, "count": count_value})
    slots = validated
    return true
