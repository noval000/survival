extends CanvasLayer

signal closed
signal transfer_requested(from_chest: bool, slot_index: int, half: bool)

const SLOT = preload("res://scripts/InventorySlot.gd")
const UI = preload("res://scripts/UIDesign.gd")
var panel: PanelContainer
var bag_slots: Array = []
var chest_slots: Array = []
var chest
var bag

func _ready() -> void:
    layer = 25
    panel = PanelContainer.new()
    add_child(panel)
    panel.set_anchors_preset(Control.PRESET_CENTER)
    panel.position = Vector2(-420, -310)
    panel.custom_minimum_size = Vector2(840, 620)
    panel.add_theme_stylebox_override("panel", UI.panel_style())
    var column := VBoxContainer.new()
    panel.add_child(column)
    var heading := HBoxContainer.new()
    column.add_child(heading)
    var title := Label.new()
    title.text = "ХРАНИЛИЩЕ  /  РЮКЗАК"
    title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    UI.decorate_title(title, 23)
    heading.add_child(title)
    var close := Button.new()
    close.text = "ЗАКРЫТЬ"
    UI.decorate_button(close)
    close.pressed.connect(close_storage)
    heading.add_child(close)
    var columns := HBoxContainer.new()
    columns.add_theme_constant_override("separation", 24)
    column.add_child(columns)
    for side in range(2):
        var section := VBoxContainer.new()
        columns.add_child(section)
        var label := Label.new()
        label.text = "РЮКЗАК" if side == 0 else "ДЕРЕВЯННЫЙ СУНДУК"
        UI.decorate_title(label, 17)
        section.add_child(label)
        var grid := GridContainer.new()
        grid.columns = 4
        grid.add_theme_constant_override("h_separation", 4)
        grid.add_theme_constant_override("v_separation", 4)
        section.add_child(grid)
        for index in range(24):
            var slot = SLOT.new()
            slot.custom_minimum_size = Vector2(88, 88)
            slot.slot_index = -1
            slot.draggable = false
            slot.slot_pressed.connect(_slot_clicked.bind(side == 1, index))
            grid.add_child(slot)
            if side == 0:
                bag_slots.append(slot)
            else:
                chest_slots.append(slot)
    var hint := Label.new()
    hint.text = "ЛКМ — перенести стек целиком  •  SHIFT + ЛКМ — перенести половину  •  ESC — закрыть"
    column.add_child(hint)
    panel.visible = false

func open_storage(target, backpack) -> void:
    chest = target
    bag = backpack
    panel.visible = true
    refresh()

func close_storage() -> void:
    panel.visible = false
    chest = null
    bag = null
    closed.emit()

func is_open() -> bool:
    return panel.visible

func _slot_clicked(_kind: String, from_chest: bool, index: int) -> void:
    transfer_requested.emit(from_chest, index, Input.is_key_pressed(KEY_SHIFT))

func refresh() -> void:
    if chest == null or bag == null:
        return
    for index in range(24):
        var a: Dictionary = bag.slots[index]
        var b: Dictionary = chest.storage.slots[index]
        bag_slots[index].update_item(str(a.get("kind", "")), int(a.get("count", 0)), str(a.get("kind", "")))
        chest_slots[index].update_item(str(b.get("kind", "")), int(b.get("count", 0)), str(b.get("kind", "")))
