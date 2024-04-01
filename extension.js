import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const TrueInvertWindowEffect = GObject.registerClass({
    Name: 'TrueInvertWindowEffect',
}, class TrueInvertWindowEffect extends Clutter.ShaderEffect {
    _init() {
        super._init();
        this.set_shader_source(`
            uniform bool invert_color;
            uniform float opacity = 1.0;
            uniform sampler2D tex;

            /**
             * based on shift_whitish.glsl https://github.com/vn971/linux-color-inversion with minor edits.
             */
            void main() {
                vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);
                float white_bias = c.a * 0.1; // lower -> higher contrast
                float m = 1.0 + white_bias;

                float shift = white_bias + c.a - min(c.r, min(c.g, c.b)) - max(c.r, max(c.g, c.b));

                c = vec4((shift + c.r) / m,
                        (shift + c.g) / m,
                        (shift + c.b) / m,
                        c.a);

                cogl_color_out = c;
            }
        `);
    }
});

class InvertWindow {
    constructor(settings) {
        this.settings = settings
    }

    toggle_effect() {
        global.get_window_actors().forEach((actor) => {
            let meta_window = actor.meta_window;
            if (meta_window.has_focus()) {
                if (actor.get_effect('invert-color')) {
                    actor.remove_effect_by_name('invert-color');
                } else {
                    let effect = new TrueInvertWindowEffect();
                    actor.add_effect_with_name('invert-color', effect);
                }
            }
        });
    }

    enable() {
        Main.wm.addKeybinding(
            'invert-window-shortcut',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            this.toggle_effect.bind(this)
        );
    }

    disable() {
        Main.wm.removeKeybinding('invert-window-shortcut');
    }
}

export default class TrueColorWindowInvertExtension extends Extension {
    constructor(metadata) {
        super(metadata)
        this.invertWindow = new InvertWindow(this.getSettings());
    }

    enable() {
        this.invertWindow.enable();
    }

    disable() {
        this.invertWindow.disable();
    }
}

