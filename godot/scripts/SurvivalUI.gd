extends CanvasLayer
const UI = preload("res://scripts/UIDesign.gd")
const UI = preload("res://scripts/UIDesign.gd")

var health_bar: ProgressBar
var hunger_bar: ProgressBar
var thirst_bar: ProgressBar
var death_panel: PanelContainer
signal respawn_requested

func _ready() -> void:
    layer = 12
    var column := VBoxContainer.new()
    column.position = Vector2(20, 185)
    column.custom_minimum_size = Vector2(225, 100)
    add_child(column)
    for stat in ["ЗДОРОВЬЕ", "СЫТОСТЬ", "ЖАЖДА"]:
        var label := Label.new()
        label.text = stat
        UI.decorate_title(label, 14)
        UI.decorate_title(label, 14)
        column.add_child(label)
        var bar := ProgressBar.new()
        bar.max_value = 100.0
        bar.value = 100.0
        bar.custom_minimum_size = Vector2(210, 16)
        bar.show_percentage = false
        column.add_child(bar)
        if stat == "ЗДОРОВЬЕ":
            health_bar = bar
        elif stat == "СЫТОСТЬ":
            hunger_bar = bar
        else:
            thirst_bar = bar
    death_panel = PanelContainer.new()
    death_panel.set_anchors_preset(Control.PRESET_CENTER)
    death_panel.position = Vector2(-160, -80)
    death_panel.custom_minimum_size = Vector2(320, 160)
    add_child(death_panel)
    var contents := VBoxContainer.new()
    death_panel.add_theme_stylebox_override("panel", UI.panel_style())
    death_panel.add_theme_stylebox_override("panel", UI.panel_style())
    death_panel.add_child(contents)
    var title := Label.new()
    title.text = "ВЫ ПОГИБЛИ"
    title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    title.add_theme_font_size_override("font_size", 32)
    contents.add_child(title)
    var button := Button.new()
    button.text = "ВОЗРОДИТЬСЯ"
    button.pressed.connect(func() -> void: respawn_requested.emit())
    UI.decorate_button(button, true)
    UI.decorate_button(button, true)
    contents.add_child(button)
    death_panel.visible = false

func update_stats(health: float, hunger: float, thirst: float) -> void:
    health_bar.value = health
    hunger_bar.value = hunger
    thirst_bar.value = thirst

func set_dead(dead: bool) -> void:
    death_panel.visible = dead
