extends CanvasLayer

signal closed
signal deposit_requested(kind: String, amount: int)
signal withdraw_requested
signal toggle_requested

const UI = preload("res://scripts/UIDesign.gd")
var furnace
var panel: PanelContainer
var status: Label
var amounts: Label
var start_button: Button

func _ready() -> void:
    layer = 26
    panel = PanelContainer.new()
    add_child(panel)
    panel.set_anchors_preset(Control.PRESET_CENTER)
    panel.position = Vector2(-250, -175)
    panel.custom_minimum_size = Vector2(500, 350)
    panel.add_theme_stylebox_override("panel", UI.panel_style())
    var layout := VBoxContainer.new()
    layout.add_theme_constant_override("separation", 12)
    panel.add_child(layout)
    var heading := Label.new()
    heading.text = "ПЛАВИЛЬНАЯ ПЕЧЬ"
    UI.decorate_title(heading, 24)
    layout.add_child(heading)
    amounts = Label.new()
    layout.add_child(amounts)
    status = Label.new()
    layout.add_child(status)
    for kind in ["iron", "coal"]:
        var row := HBoxContainer.new()
        layout.add_child(row)
        for count in [1, 10]:
            var button := Button.new()
            button.text = ("РУДА" if kind == "iron" else "УГОЛЬ") + " +%d" % count
            UI.decorate_button(button)
            button.pressed.connect(_deposit.bind(kind, count))
            row.add_child(button)
    start_button = Button.new()
    UI.decorate_button(start_button, true)
    start_button.pressed.connect(_toggle)
    layout.add_child(start_button)
    var withdraw := Button.new()
    withdraw.text = "ЗАБРАТЬ СЛИТКИ"
    UI.decorate_button(withdraw)
    withdraw.pressed.connect(_withdraw)
    layout.add_child(withdraw)
    var close := Button.new()
    close.text = "ЗАКРЫТЬ"
    UI.decorate_button(close)
    close.pressed.connect(close_furnace)
    layout.add_child(close)
    panel.visible = false

func open_furnace(target) -> void:
    furnace = target
    panel.visible = true
    refresh()

func close_furnace() -> void:
    panel.visible = false
    furnace = null
    closed.emit()

func is_open() -> bool:
    return panel.visible

func _process(_delta: float) -> void:
    if is_open():
        refresh()

func refresh() -> void:
    if not is_instance_valid(furnace):
        return
    var process = furnace.process
    amounts.text = "Руда: %d    Уголь: %d    Слитки: %d" % [process.storage.count("iron"), process.storage.count("coal"), process.storage.count("iron_bar")]
    status.text = "Плавка: %d%%" % int(process.progress / process.SECONDS_PER_BAR * 100.0) if process.active else "Печь выключена"
    start_button.text = "ОСТАНОВИТЬ" if process.active else "ЗАПУСТИТЬ"

func _deposit(kind: String, amount: int) -> void:
    deposit_requested.emit(kind, amount)

func _withdraw() -> void:
    withdraw_requested.emit()

func _toggle() -> void:
    toggle_requested.emit()
