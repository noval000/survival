extends PanelContainer

signal slot_pressed(kind: String)
signal item_dropped(kind: String, target_index: int)
signal stack_dropped(source_index: int, target_index: int, split: bool)
signal slot_secondary_pressed(index: int)

var item_kind := ""
var slot_index := -1
var icon: TextureRect
var amount_label: Label
var title_label: Label
var quantity := 0
var draggable := false

const UI = preload("res://scripts/UIDesign.gd")
const ICON_DIR := "res://assets/icons/"

func _ready() -> void:
    if custom_minimum_size == Vector2.ZERO:
        custom_minimum_size = Vector2(90, 94)
    mouse_filter = Control.MOUSE_FILTER_STOP
    add_theme_stylebox_override("panel", UI.panel_style())
    var stack := VBoxContainer.new()
    stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(stack)
    icon = TextureRect.new()
    icon.custom_minimum_size = Vector2(48, 48)
    icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
    stack.add_child(icon)
    title_label = Label.new()
    title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    title_label.add_theme_font_size_override("font_size", 11)
    title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    stack.add_child(title_label)
    amount_label = Label.new()
    amount_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
    amount_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    stack.add_child(amount_label)
    update_item("", 0)

func update_item(kind: String, count: int, title: String = "") -> void:
    item_kind = kind
    quantity = count
    if icon == null:
        return
    var icon_path := ICON_DIR + kind + ".svg"
    if kind != "" and ResourceLoader.exists(icon_path):
        icon.texture = load(icon_path) as Texture2D
    else:
        icon.texture = null
    title_label.text = title
    amount_label.text = ("×%d" % count) if count > 0 else ""
    modulate = Color.WHITE if count > 0 else Color(0.55, 0.61, 0.62)

func _gui_input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.pressed:
        if event.button_index == MOUSE_BUTTON_RIGHT and slot_index >= 100:
            slot_secondary_pressed.emit(slot_index - 100)
            accept_event()
        elif event.button_index == MOUSE_BUTTON_LEFT and item_kind != "" and quantity > 0:
            slot_pressed.emit(item_kind)

func _get_drag_data(_at_position: Vector2) -> Variant:
    if not draggable or item_kind == "" or quantity <= 0:
        return null
    var preview := TextureRect.new()
    preview.texture = icon.texture
    preview.custom_minimum_size = Vector2(54, 54)
    preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    set_drag_preview(preview)
    return {"kind": item_kind, "source_index": slot_index}

func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
    if slot_index < 0 or typeof(data) != TYPE_DICTIONARY or str(data.get("kind", "")) == "":
        return false
    var source: int = int(data.get("source_index", -1))
    return (slot_index >= 100 and source >= 100) or (slot_index < 100)

func _drop_data(_at_position: Vector2, data: Variant) -> void:
    if _can_drop_data(Vector2.ZERO, data):
        if int(data.get("source_index", -1)) >= 100 and slot_index >= 100:
            stack_dropped.emit(int(data["source_index"]) - 100, slot_index - 100, Input.is_key_pressed(KEY_SHIFT))
        else:
            item_dropped.emit(str(data["kind"]), slot_index)
