extends RefCounted

const SAVE_PATH := "user://survival_save.json"
const VERSION := 1

static func save_game(player: CharacterBody3D, building: Node3D) -> bool:
    var structures: Array = []
    for item in building.placed:
        var p: Vector3 = item["position"]
        structures.append({"type": str(item["type"]), "position": [p.x, p.y, p.z], "rotation": int(item["rotation"])})
    var data := {
        "version": VERSION,
        "position": [player.global_position.x, player.global_position.y, player.global_position.z],
        "resources": player.resources.duplicate(),
        "tools": player.owned_tools.duplicate(),
        "equipped_tool": player.equipped_tool,
        "health": player.health,
        "hunger": player.hunger,
        "thirst": player.thirst,
        "structures": structures
    }
    var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if file == null:
        push_warning("Cannot write save: %s" % FileAccess.get_open_error())
        return false
    file.store_string(JSON.stringify(data))
    file.close()
    return true

static func load_game() -> Dictionary:
    if not FileAccess.file_exists(SAVE_PATH):
        return {}
    var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
    if file == null:
        return {}
    var parsed: Variant = JSON.parse_string(file.get_as_text())
    file.close()
    if typeof(parsed) != TYPE_DICTIONARY:
        return {}
    var data: Dictionary = parsed
    if int(data.get("version", -1)) != VERSION:
        return {}
    return data
