extends CanvasLayer

const PIECES := [
    ["foundation", "ФУНДАМЕНТ", "▦", "20 древесины · 10 камня"],
    ["wall", "СТЕНА", "▥", "4 доски"],
    ["doorway", "ДВЕРНОЙ ПРОЁМ", "▣", "3 доски"],
    ["roof", "КРЫША", "▤", "6 досок"]
]
signal piece_requested(kind: String)
signal rotate_requested
var bar: PanelContainer
var buttons: Dictionary = {}
var detail: Label

func _ready() -> void:
    layer = 11
    var anchor := Control.new()
    anchor.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(anchor)
    bar = PanelContainer.new()
    bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
    bar.position = Vector2(-390, -190)
    bar.custom_minimum_size = Vector2(780, 120)
    anchor.add_child(bar)
    var style := StyleBoxFlat.new()
    style.bg_color = Color(0.08, 0.10, 0.11, 0.92)
    style.set_corner_radius_all(10)
    style.set_content_margin_all(12)
    bar.add_theme_stylebox_override("panel", style)
    var column := VBoxContainer.new()
    bar.add_child(column)
    var title := Label.new()
    title.text = "СТРОИТЕЛЬСТВО   •   B — выйти   •   R — повернуть   •   ЛКМ — поставить"
    column.add_child(title)
    var choices := HBoxContainer.new()
    choices.add_theme_constant_override("separation", 7)
    column.add_child(choices)
    for i in range(PIECES.size()):
        var data: Array = PIECES[i]
        var button := Button.new()
        button.custom_minimum_size = Vector2(182, 60)
        button.text = "%d   %s  %s" % [i + 1, data[2], data[1]]
        button.pressed.connect(_choose.bind(str(data[0])))
        choices.add_child(button)
        buttons[data[0]] = button
    detail = Label.new()
    column.add_child(detail)
    bar.visible = false

func _choose(kind: String) -> void:
    piece_requested.emit(kind)

func update_building(enabled: bool, selected: String, can_place: bool, resources: Dictionary) -> void:
    if bar == null:
        return
    bar.visible = enabled
    if not enabled:
        return
    for data in PIECES:
        var button: Button = buttons[data[0]]
        button.button_pressed = selected == data[0]
        button.modulate = Color(0.48, 0.92, 0.62) if selected == data[0] else Color.WHITE
    var selected_data: Array = PIECES[0]
    for data in PIECES:
        if data[0] == selected:
            selected_data = data
            break
    var costs: Dictionary = {}
    if selected == "foundation":
        costs = {"wood": 20, "stone": 10}
    elif selected == "wall":
        costs = {"plank": 4}
    elif selected == "doorway":
        costs = {"plank": 3}
    elif selected == "roof":
        costs = {"plank": 6}
    var parts: Array[String] = []
    var affordable := true
    for material in costs:
        var have: int = int(resources.get(material, 0))
        var need: int = int(costs[material])
        affordable = affordable and have >= need
        var label: String = "Древесина" if material == "wood" else ("Камень" if material == "stone" else "Доски")
        parts.append("%s: %d / %d" % [label, have, need])
    var state := "МОЖНО СТРОИТЬ" if can_place and affordable else ("МАЛО РЕСУРСОВ" if not affordable else "НЕТ ПОДХОДЯЩЕГО МЕСТА")
    detail.text = "%s | %s | %s" % [selected_data[1], " · ".join(parts), state]
