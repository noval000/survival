extends RefCounted

# Единая дизайн-система интерфейса: цвета, отступы и состояния.
const BACKGROUND := Color("#11191e")
const SURFACE := Color("#202b31")
const SURFACE_HOVER := Color("#304049")
const BORDER := Color("#46555b")
const ACCENT := Color("#d4a35b")
const ACCENT_HOVER := Color("#e6bb7b")
const TEXT := Color("#edf0ec")
const MUTED := Color("#a4b2b4")
const SUCCESS := Color("#8ccf93")
const DANGER := Color("#ed7771")

static func panel_style(selected: bool = false) -> StyleBoxFlat:
    var s := StyleBoxFlat.new()
    s.bg_color = SURFACE if not selected else Color("#34433e")
    s.border_color = ACCENT if selected else BORDER
    s.set_border_width_all(2 if selected else 1)
    s.set_corner_radius_all(6)
    s.set_content_margin_all(12)
    return s

static func button_style(hovered: bool = false, selected: bool = false) -> StyleBoxFlat:
    var s := StyleBoxFlat.new()
    s.bg_color = ACCENT if selected else (SURFACE_HOVER if hovered else SURFACE)
    s.border_color = ACCENT if selected else BORDER
    s.set_border_width_all(1)
    s.set_corner_radius_all(5)
    s.set_content_margin_all(10)
    return s

static func decorate_button(button: Button, selected: bool = false) -> void:
    button.add_theme_stylebox_override("normal", button_style(false, selected))
    button.add_theme_stylebox_override("hover", button_style(true, selected))
    button.add_theme_stylebox_override("pressed", button_style(false, true))
    button.add_theme_stylebox_override("disabled", button_style())
    button.add_theme_color_override("font_color", TEXT if not selected else BACKGROUND)
    button.add_theme_color_override("font_hover_color", TEXT)
    button.add_theme_color_override("font_pressed_color", BACKGROUND)
    button.add_theme_color_override("font_disabled_color", MUTED)
    button.add_theme_font_size_override("font_size", 16)

static func decorate_title(label: Label, size: int = 22) -> void:
    label.add_theme_color_override("font_color", TEXT)
    label.add_theme_font_size_override("font_size", size)

static func decorate_muted(label: Label) -> void:
    label.add_theme_color_override("font_color", MUTED)
