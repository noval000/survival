extends CanvasLayer
const UI = preload("res://scripts/UIDesign.gd")
const UI = preload("res://scripts/UIDesign.gd")

signal inventory_pressed
signal build_pressed
signal interact_pressed
signal rotate_pressed
signal save_pressed
signal tool_pressed(kind: String)

var hint: Label
var controls: HBoxContainer

func _ready() -> void:
    layer = 13
    var root := Control.new()
    root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(root)
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    controls = HBoxContainer.new()
    controls.set_anchors_preset(Control.PRESET_TOP_RIGHT)
    controls.position = Vector2(-600, 18)
    controls.add_theme_constant_override("separation", 6)
    root.add_child(controls)
    add_action("Рюкзак", inventory_pressed.emit)
    add_action("Стройка", build_pressed.emit)
    add_action("Взять / пить", interact_pressed.emit)
    add_action("Поворот", rotate_pressed.emit)
    add_action("Топор", func() -> void: tool_pressed.emit("axe"))
    add_action("Кирка", func() -> void: tool_pressed.emit("pickaxe"))
    add_action("Сохранить", save_pressed.emit)
    hint = Label.new()
    hint.text = "ALT — включить курсор для кнопок"
    hint.set_anchors_preset(Control.PRESET_TOP_RIGHT)
    hint.position = Vector2(-310, 67)
    root.add_child(hint)

func add_action(caption: String, callback: Callable) -> void:
    var button := Button.new()
    button.text = caption
    button.custom_minimum_size = Vector2(78, 43)
    button.pressed.connect(callback)
    UI.decorate_button(button)
    UI.decorate_button(button)
    controls.add_child(button)

func set_cursor_visible(enabled: bool) -> void:
    if hint != null:
        hint.text = "Курсор активен · ALT — вернуться к игре" if enabled else "ALT — включить курсор для кнопок"
