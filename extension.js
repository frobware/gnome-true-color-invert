const Main = imports.ui.main;
const GObject = imports.gi.GObject;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();
const Convenience = Self.imports.convenience;

const SHORTCUT = 'invert-window-shortcut';

const TrueInvertWindowEffect = new GObject.registerClass({
	Name: 'TrueInvertWindowEffect',
}, class TrueInvertWindowEffect extends Clutter.ShaderEffect {
	vfunc_get_static_shader_source() {
		return `
			uniform bool invert_color;
			uniform float opacity = 1.0;
			uniform sampler2D tex;

			/**
			 * based on shift_whitish.glsl https://github.com/vn971/linux-color-inversion with minor edits
			 */
			void main() {
				vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);

				float white_bias = 0.1; // lower -> higher contrast
				float m = 1.0 + white_bias;
				
				float shift = white_bias + c.a - min(c.r, min(c.g, c.b)) - max(c.r, max(c.g, c.b));
				
				c = vec4((shift + c.r) / m, 
						(shift + c.g) / m, 
						(shift + c.b) / m, 
						c.a);

				cogl_color_out = c;
			}
		`;
	}

	vfunc_paint_target(paint_node = null, paint_context = null) {
		this.set_uniform_value("tex", 0);

		if (paint_node && paint_context)
			super.vfunc_paint_target(paint_node, paint_context);
		else if (paint_node)
			super.vfunc_paint_target(paint_node);
		else
			super.vfunc_paint_target();
	}
});

function InvertWindow() {
	this.settings = Convenience.getSettings();
}

InvertWindow.prototype = {
	toggle_effect: function () {
		global.get_window_actors().forEach(function (actor) {
			let meta_window = actor.get_meta_window();
			if (meta_window.has_focus()) {
				if (actor.get_effect('invert-color')) {
					actor.remove_effect_by_name('invert-color');
					delete meta_window._invert_window_tag;
				}
				else {
					let effect = new TrueInvertWindowEffect();
					actor.add_effect_with_name('invert-color', effect);
					meta_window._invert_window_tag = true;
				}
			}
		}, this);
	},

	enable: function () {
		Main.wm.addKeybinding(
			SHORTCUT,
			this.settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL,
			this.toggle_effect
		);

		global.get_window_actors().forEach(function (actor) {
			let meta_window = actor.get_meta_window();
			if (meta_window.hasOwnProperty('_invert_window_tag')) {
				let effect = new TrueInvertWindowEffect();
				actor.add_effect_with_name('invert-color', effect);
			}
		}, this);
	},

	disable: function () {
		Main.wm.removeKeybinding(SHORTCUT);

		global.get_window_actors().forEach(function (actor) {
			actor.remove_effect_by_name('invert-color');
		}, this);
	}
};

let invert_window;

function init() {
}

function enable() {
	invert_window = new InvertWindow();
	invert_window.enable();
}

function disable() {
	invert_window.disable();
	invert_window = null;
}

