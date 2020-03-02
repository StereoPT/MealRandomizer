
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.17.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src\App.svelte generated by Svelte v3.17.1 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let p0;
    	let t3_value = /*meal*/ ctx[1].idMeal + "";
    	let t3;
    	let t4;
    	let img;
    	let img_src_value;
    	let t5;
    	let p1;
    	let t6_value = /*meal*/ ctx[1].strMeal + "";
    	let t6;
    	let t7;
    	let p2;
    	let t8_value = /*meal*/ ctx[1].strCategory + "";
    	let t8;
    	let t9;
    	let p3;
    	let t10_value = /*meal*/ ctx[1].strArea + "";
    	let t10;
    	let t11;
    	let p4;
    	let t12_value = /*meal*/ ctx[1].strInstructions + "";
    	let t12;
    	let t13;
    	let p5;
    	let t14_value = /*meal*/ ctx[1].strTags + "";
    	let t14;
    	let t15;
    	let a;
    	let t16_value = /*meal*/ ctx[1].strSource + "";
    	let t16;
    	let a_href_value;
    	let t17;
    	let ul;
    	let li0;
    	let t18_value = /*meal*/ ctx[1].strMeasure1 + "";
    	let t18;
    	let t19;
    	let t20_value = /*meal*/ ctx[1].strIngredient1 + "";
    	let t20;
    	let t21;
    	let li1;
    	let t22_value = /*meal*/ ctx[1].strMeasure2 + "";
    	let t22;
    	let t23;
    	let t24_value = /*meal*/ ctx[1].strIngredient2 + "";
    	let t24;
    	let t25;
    	let li2;
    	let t26_value = /*meal*/ ctx[1].strMeasure3 + "";
    	let t26;
    	let t27;
    	let t28_value = /*meal*/ ctx[1].strIngredient3 + "";
    	let t28;
    	let t29;
    	let li3;
    	let t30_value = /*meal*/ ctx[1].strMeasure4 + "";
    	let t30;
    	let t31;
    	let t32_value = /*meal*/ ctx[1].strIngredient4 + "";
    	let t32;
    	let t33;
    	let li4;
    	let t34_value = /*meal*/ ctx[1].strMeasure5 + "";
    	let t34;
    	let t35;
    	let t36_value = /*meal*/ ctx[1].strIngredient5 + "";
    	let t36;
    	let t37;
    	let li5;
    	let t38_value = /*meal*/ ctx[1].strMeasure6 + "";
    	let t38;
    	let t39;
    	let t40_value = /*meal*/ ctx[1].strIngredient6 + "";
    	let t40;
    	let t41;
    	let li6;
    	let t42_value = /*meal*/ ctx[1].strMeasure7 + "";
    	let t42;
    	let t43;
    	let t44_value = /*meal*/ ctx[1].strIngredient7 + "";
    	let t44;
    	let t45;
    	let li7;
    	let t46_value = /*meal*/ ctx[1].strMeasure8 + "";
    	let t46;
    	let t47;
    	let t48_value = /*meal*/ ctx[1].strIngredient8 + "";
    	let t48;
    	let t49;
    	let li8;
    	let t50_value = /*meal*/ ctx[1].strMeasure9 + "";
    	let t50;
    	let t51;
    	let t52_value = /*meal*/ ctx[1].strIngredient9 + "";
    	let t52;
    	let t53;
    	let li9;
    	let t54_value = /*meal*/ ctx[1].strMeasure10 + "";
    	let t54;
    	let t55;
    	let t56_value = /*meal*/ ctx[1].strIngredient10 + "";
    	let t56;
    	let t57;
    	let li10;
    	let t58_value = /*meal*/ ctx[1].strMeasure11 + "";
    	let t58;
    	let t59;
    	let t60_value = /*meal*/ ctx[1].strIngredient11 + "";
    	let t60;
    	let t61;
    	let li11;
    	let t62_value = /*meal*/ ctx[1].strMeasure12 + "";
    	let t62;
    	let t63;
    	let t64_value = /*meal*/ ctx[1].strIngredient12 + "";
    	let t64;
    	let t65;
    	let li12;
    	let t66_value = /*meal*/ ctx[1].strMeasure13 + "";
    	let t66;
    	let t67;
    	let t68_value = /*meal*/ ctx[1].strIngredient13 + "";
    	let t68;
    	let t69;
    	let li13;
    	let t70_value = /*meal*/ ctx[1].strMeasure14 + "";
    	let t70;
    	let t71;
    	let t72_value = /*meal*/ ctx[1].strIngredient14 + "";
    	let t72;
    	let t73;
    	let li14;
    	let t74_value = /*meal*/ ctx[1].strMeasure15 + "";
    	let t74;
    	let t75;
    	let t76_value = /*meal*/ ctx[1].strIngredient15 + "";
    	let t76;
    	let t77;
    	let li15;
    	let t78_value = /*meal*/ ctx[1].strMeasure16 + "";
    	let t78;
    	let t79;
    	let t80_value = /*meal*/ ctx[1].strIngredient16 + "";
    	let t80;
    	let t81;
    	let li16;
    	let t82_value = /*meal*/ ctx[1].strMeasure17 + "";
    	let t82;
    	let t83;
    	let t84_value = /*meal*/ ctx[1].strIngredient17 + "";
    	let t84;
    	let t85;
    	let li17;
    	let t86_value = /*meal*/ ctx[1].strMeasure18 + "";
    	let t86;
    	let t87;
    	let t88_value = /*meal*/ ctx[1].strIngredient18 + "";
    	let t88;
    	let t89;
    	let li18;
    	let t90_value = /*meal*/ ctx[1].strMeasure19 + "";
    	let t90;
    	let t91;
    	let t92_value = /*meal*/ ctx[1].strIngredient19 + "";
    	let t92;
    	let t93;
    	let li19;
    	let t94_value = /*meal*/ ctx[1].strMeasure20 + "";
    	let t94;
    	let t95;
    	let t96_value = /*meal*/ ctx[1].strIngredient20 + "";
    	let t96;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text(/*appName*/ ctx[0]);
    			t1 = text("!");
    			t2 = space();
    			p0 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			img = element("img");
    			t5 = space();
    			p1 = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			p2 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			p3 = element("p");
    			t10 = text(t10_value);
    			t11 = space();
    			p4 = element("p");
    			t12 = text(t12_value);
    			t13 = space();
    			p5 = element("p");
    			t14 = text(t14_value);
    			t15 = space();
    			a = element("a");
    			t16 = text(t16_value);
    			t17 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t18 = text(t18_value);
    			t19 = text(" - ");
    			t20 = text(t20_value);
    			t21 = space();
    			li1 = element("li");
    			t22 = text(t22_value);
    			t23 = text(" - ");
    			t24 = text(t24_value);
    			t25 = space();
    			li2 = element("li");
    			t26 = text(t26_value);
    			t27 = text(" - ");
    			t28 = text(t28_value);
    			t29 = space();
    			li3 = element("li");
    			t30 = text(t30_value);
    			t31 = text(" - ");
    			t32 = text(t32_value);
    			t33 = space();
    			li4 = element("li");
    			t34 = text(t34_value);
    			t35 = text(" - ");
    			t36 = text(t36_value);
    			t37 = space();
    			li5 = element("li");
    			t38 = text(t38_value);
    			t39 = text(" - ");
    			t40 = text(t40_value);
    			t41 = space();
    			li6 = element("li");
    			t42 = text(t42_value);
    			t43 = text(" - ");
    			t44 = text(t44_value);
    			t45 = space();
    			li7 = element("li");
    			t46 = text(t46_value);
    			t47 = text(" - ");
    			t48 = text(t48_value);
    			t49 = space();
    			li8 = element("li");
    			t50 = text(t50_value);
    			t51 = text(" - ");
    			t52 = text(t52_value);
    			t53 = space();
    			li9 = element("li");
    			t54 = text(t54_value);
    			t55 = text(" - ");
    			t56 = text(t56_value);
    			t57 = space();
    			li10 = element("li");
    			t58 = text(t58_value);
    			t59 = text(" - ");
    			t60 = text(t60_value);
    			t61 = space();
    			li11 = element("li");
    			t62 = text(t62_value);
    			t63 = text(" - ");
    			t64 = text(t64_value);
    			t65 = space();
    			li12 = element("li");
    			t66 = text(t66_value);
    			t67 = text(" - ");
    			t68 = text(t68_value);
    			t69 = space();
    			li13 = element("li");
    			t70 = text(t70_value);
    			t71 = text(" - ");
    			t72 = text(t72_value);
    			t73 = space();
    			li14 = element("li");
    			t74 = text(t74_value);
    			t75 = text(" - ");
    			t76 = text(t76_value);
    			t77 = space();
    			li15 = element("li");
    			t78 = text(t78_value);
    			t79 = text(" - ");
    			t80 = text(t80_value);
    			t81 = space();
    			li16 = element("li");
    			t82 = text(t82_value);
    			t83 = text(" - ");
    			t84 = text(t84_value);
    			t85 = space();
    			li17 = element("li");
    			t86 = text(t86_value);
    			t87 = text(" - ");
    			t88 = text(t88_value);
    			t89 = space();
    			li18 = element("li");
    			t90 = text(t90_value);
    			t91 = text(" - ");
    			t92 = text(t92_value);
    			t93 = space();
    			li19 = element("li");
    			t94 = text(t94_value);
    			t95 = text(" - ");
    			t96 = text(t96_value);
    			attr_dev(h1, "class", "svelte-1saj8cy");
    			add_location(h1, file, 16, 1, 314);
    			add_location(p0, file, 18, 1, 336);
    			if (img.src !== (img_src_value = /*meal*/ ctx[1].strMealThumb)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Meal Image");
    			add_location(img, file, 19, 1, 358);
    			add_location(p1, file, 20, 1, 407);
    			add_location(p2, file, 21, 1, 430);
    			add_location(p3, file, 22, 1, 457);
    			add_location(p4, file, 23, 1, 480);
    			add_location(p5, file, 24, 1, 511);
    			attr_dev(a, "href", a_href_value = /*meal*/ ctx[1].strSource);
    			add_location(a, file, 25, 1, 534);
    			add_location(li0, file, 28, 2, 589);
    			add_location(li1, file, 29, 2, 643);
    			add_location(li2, file, 30, 2, 697);
    			add_location(li3, file, 31, 2, 751);
    			add_location(li4, file, 32, 2, 805);
    			add_location(li5, file, 33, 2, 859);
    			add_location(li6, file, 34, 2, 913);
    			add_location(li7, file, 35, 2, 967);
    			add_location(li8, file, 36, 2, 1021);
    			add_location(li9, file, 37, 2, 1075);
    			add_location(li10, file, 38, 2, 1131);
    			add_location(li11, file, 39, 2, 1187);
    			add_location(li12, file, 40, 2, 1243);
    			add_location(li13, file, 41, 2, 1299);
    			add_location(li14, file, 42, 2, 1355);
    			add_location(li15, file, 43, 2, 1411);
    			add_location(li16, file, 44, 2, 1467);
    			add_location(li17, file, 45, 2, 1523);
    			add_location(li18, file, 46, 2, 1579);
    			add_location(li19, file, 47, 2, 1635);
    			add_location(ul, file, 27, 1, 582);
    			attr_dev(main, "class", "svelte-1saj8cy");
    			add_location(main, file, 15, 0, 306);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(main, t2);
    			append_dev(main, p0);
    			append_dev(p0, t3);
    			append_dev(main, t4);
    			append_dev(main, img);
    			append_dev(main, t5);
    			append_dev(main, p1);
    			append_dev(p1, t6);
    			append_dev(main, t7);
    			append_dev(main, p2);
    			append_dev(p2, t8);
    			append_dev(main, t9);
    			append_dev(main, p3);
    			append_dev(p3, t10);
    			append_dev(main, t11);
    			append_dev(main, p4);
    			append_dev(p4, t12);
    			append_dev(main, t13);
    			append_dev(main, p5);
    			append_dev(p5, t14);
    			append_dev(main, t15);
    			append_dev(main, a);
    			append_dev(a, t16);
    			append_dev(main, t17);
    			append_dev(main, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t18);
    			append_dev(li0, t19);
    			append_dev(li0, t20);
    			append_dev(ul, t21);
    			append_dev(ul, li1);
    			append_dev(li1, t22);
    			append_dev(li1, t23);
    			append_dev(li1, t24);
    			append_dev(ul, t25);
    			append_dev(ul, li2);
    			append_dev(li2, t26);
    			append_dev(li2, t27);
    			append_dev(li2, t28);
    			append_dev(ul, t29);
    			append_dev(ul, li3);
    			append_dev(li3, t30);
    			append_dev(li3, t31);
    			append_dev(li3, t32);
    			append_dev(ul, t33);
    			append_dev(ul, li4);
    			append_dev(li4, t34);
    			append_dev(li4, t35);
    			append_dev(li4, t36);
    			append_dev(ul, t37);
    			append_dev(ul, li5);
    			append_dev(li5, t38);
    			append_dev(li5, t39);
    			append_dev(li5, t40);
    			append_dev(ul, t41);
    			append_dev(ul, li6);
    			append_dev(li6, t42);
    			append_dev(li6, t43);
    			append_dev(li6, t44);
    			append_dev(ul, t45);
    			append_dev(ul, li7);
    			append_dev(li7, t46);
    			append_dev(li7, t47);
    			append_dev(li7, t48);
    			append_dev(ul, t49);
    			append_dev(ul, li8);
    			append_dev(li8, t50);
    			append_dev(li8, t51);
    			append_dev(li8, t52);
    			append_dev(ul, t53);
    			append_dev(ul, li9);
    			append_dev(li9, t54);
    			append_dev(li9, t55);
    			append_dev(li9, t56);
    			append_dev(ul, t57);
    			append_dev(ul, li10);
    			append_dev(li10, t58);
    			append_dev(li10, t59);
    			append_dev(li10, t60);
    			append_dev(ul, t61);
    			append_dev(ul, li11);
    			append_dev(li11, t62);
    			append_dev(li11, t63);
    			append_dev(li11, t64);
    			append_dev(ul, t65);
    			append_dev(ul, li12);
    			append_dev(li12, t66);
    			append_dev(li12, t67);
    			append_dev(li12, t68);
    			append_dev(ul, t69);
    			append_dev(ul, li13);
    			append_dev(li13, t70);
    			append_dev(li13, t71);
    			append_dev(li13, t72);
    			append_dev(ul, t73);
    			append_dev(ul, li14);
    			append_dev(li14, t74);
    			append_dev(li14, t75);
    			append_dev(li14, t76);
    			append_dev(ul, t77);
    			append_dev(ul, li15);
    			append_dev(li15, t78);
    			append_dev(li15, t79);
    			append_dev(li15, t80);
    			append_dev(ul, t81);
    			append_dev(ul, li16);
    			append_dev(li16, t82);
    			append_dev(li16, t83);
    			append_dev(li16, t84);
    			append_dev(ul, t85);
    			append_dev(ul, li17);
    			append_dev(li17, t86);
    			append_dev(li17, t87);
    			append_dev(li17, t88);
    			append_dev(ul, t89);
    			append_dev(ul, li18);
    			append_dev(li18, t90);
    			append_dev(li18, t91);
    			append_dev(li18, t92);
    			append_dev(ul, t93);
    			append_dev(ul, li19);
    			append_dev(li19, t94);
    			append_dev(li19, t95);
    			append_dev(li19, t96);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*appName*/ 1) set_data_dev(t0, /*appName*/ ctx[0]);
    			if (dirty & /*meal*/ 2 && t3_value !== (t3_value = /*meal*/ ctx[1].idMeal + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*meal*/ 2 && img.src !== (img_src_value = /*meal*/ ctx[1].strMealThumb)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*meal*/ 2 && t6_value !== (t6_value = /*meal*/ ctx[1].strMeal + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*meal*/ 2 && t8_value !== (t8_value = /*meal*/ ctx[1].strCategory + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*meal*/ 2 && t10_value !== (t10_value = /*meal*/ ctx[1].strArea + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*meal*/ 2 && t12_value !== (t12_value = /*meal*/ ctx[1].strInstructions + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*meal*/ 2 && t14_value !== (t14_value = /*meal*/ ctx[1].strTags + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*meal*/ 2 && t16_value !== (t16_value = /*meal*/ ctx[1].strSource + "")) set_data_dev(t16, t16_value);

    			if (dirty & /*meal*/ 2 && a_href_value !== (a_href_value = /*meal*/ ctx[1].strSource)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*meal*/ 2 && t18_value !== (t18_value = /*meal*/ ctx[1].strMeasure1 + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*meal*/ 2 && t20_value !== (t20_value = /*meal*/ ctx[1].strIngredient1 + "")) set_data_dev(t20, t20_value);
    			if (dirty & /*meal*/ 2 && t22_value !== (t22_value = /*meal*/ ctx[1].strMeasure2 + "")) set_data_dev(t22, t22_value);
    			if (dirty & /*meal*/ 2 && t24_value !== (t24_value = /*meal*/ ctx[1].strIngredient2 + "")) set_data_dev(t24, t24_value);
    			if (dirty & /*meal*/ 2 && t26_value !== (t26_value = /*meal*/ ctx[1].strMeasure3 + "")) set_data_dev(t26, t26_value);
    			if (dirty & /*meal*/ 2 && t28_value !== (t28_value = /*meal*/ ctx[1].strIngredient3 + "")) set_data_dev(t28, t28_value);
    			if (dirty & /*meal*/ 2 && t30_value !== (t30_value = /*meal*/ ctx[1].strMeasure4 + "")) set_data_dev(t30, t30_value);
    			if (dirty & /*meal*/ 2 && t32_value !== (t32_value = /*meal*/ ctx[1].strIngredient4 + "")) set_data_dev(t32, t32_value);
    			if (dirty & /*meal*/ 2 && t34_value !== (t34_value = /*meal*/ ctx[1].strMeasure5 + "")) set_data_dev(t34, t34_value);
    			if (dirty & /*meal*/ 2 && t36_value !== (t36_value = /*meal*/ ctx[1].strIngredient5 + "")) set_data_dev(t36, t36_value);
    			if (dirty & /*meal*/ 2 && t38_value !== (t38_value = /*meal*/ ctx[1].strMeasure6 + "")) set_data_dev(t38, t38_value);
    			if (dirty & /*meal*/ 2 && t40_value !== (t40_value = /*meal*/ ctx[1].strIngredient6 + "")) set_data_dev(t40, t40_value);
    			if (dirty & /*meal*/ 2 && t42_value !== (t42_value = /*meal*/ ctx[1].strMeasure7 + "")) set_data_dev(t42, t42_value);
    			if (dirty & /*meal*/ 2 && t44_value !== (t44_value = /*meal*/ ctx[1].strIngredient7 + "")) set_data_dev(t44, t44_value);
    			if (dirty & /*meal*/ 2 && t46_value !== (t46_value = /*meal*/ ctx[1].strMeasure8 + "")) set_data_dev(t46, t46_value);
    			if (dirty & /*meal*/ 2 && t48_value !== (t48_value = /*meal*/ ctx[1].strIngredient8 + "")) set_data_dev(t48, t48_value);
    			if (dirty & /*meal*/ 2 && t50_value !== (t50_value = /*meal*/ ctx[1].strMeasure9 + "")) set_data_dev(t50, t50_value);
    			if (dirty & /*meal*/ 2 && t52_value !== (t52_value = /*meal*/ ctx[1].strIngredient9 + "")) set_data_dev(t52, t52_value);
    			if (dirty & /*meal*/ 2 && t54_value !== (t54_value = /*meal*/ ctx[1].strMeasure10 + "")) set_data_dev(t54, t54_value);
    			if (dirty & /*meal*/ 2 && t56_value !== (t56_value = /*meal*/ ctx[1].strIngredient10 + "")) set_data_dev(t56, t56_value);
    			if (dirty & /*meal*/ 2 && t58_value !== (t58_value = /*meal*/ ctx[1].strMeasure11 + "")) set_data_dev(t58, t58_value);
    			if (dirty & /*meal*/ 2 && t60_value !== (t60_value = /*meal*/ ctx[1].strIngredient11 + "")) set_data_dev(t60, t60_value);
    			if (dirty & /*meal*/ 2 && t62_value !== (t62_value = /*meal*/ ctx[1].strMeasure12 + "")) set_data_dev(t62, t62_value);
    			if (dirty & /*meal*/ 2 && t64_value !== (t64_value = /*meal*/ ctx[1].strIngredient12 + "")) set_data_dev(t64, t64_value);
    			if (dirty & /*meal*/ 2 && t66_value !== (t66_value = /*meal*/ ctx[1].strMeasure13 + "")) set_data_dev(t66, t66_value);
    			if (dirty & /*meal*/ 2 && t68_value !== (t68_value = /*meal*/ ctx[1].strIngredient13 + "")) set_data_dev(t68, t68_value);
    			if (dirty & /*meal*/ 2 && t70_value !== (t70_value = /*meal*/ ctx[1].strMeasure14 + "")) set_data_dev(t70, t70_value);
    			if (dirty & /*meal*/ 2 && t72_value !== (t72_value = /*meal*/ ctx[1].strIngredient14 + "")) set_data_dev(t72, t72_value);
    			if (dirty & /*meal*/ 2 && t74_value !== (t74_value = /*meal*/ ctx[1].strMeasure15 + "")) set_data_dev(t74, t74_value);
    			if (dirty & /*meal*/ 2 && t76_value !== (t76_value = /*meal*/ ctx[1].strIngredient15 + "")) set_data_dev(t76, t76_value);
    			if (dirty & /*meal*/ 2 && t78_value !== (t78_value = /*meal*/ ctx[1].strMeasure16 + "")) set_data_dev(t78, t78_value);
    			if (dirty & /*meal*/ 2 && t80_value !== (t80_value = /*meal*/ ctx[1].strIngredient16 + "")) set_data_dev(t80, t80_value);
    			if (dirty & /*meal*/ 2 && t82_value !== (t82_value = /*meal*/ ctx[1].strMeasure17 + "")) set_data_dev(t82, t82_value);
    			if (dirty & /*meal*/ 2 && t84_value !== (t84_value = /*meal*/ ctx[1].strIngredient17 + "")) set_data_dev(t84, t84_value);
    			if (dirty & /*meal*/ 2 && t86_value !== (t86_value = /*meal*/ ctx[1].strMeasure18 + "")) set_data_dev(t86, t86_value);
    			if (dirty & /*meal*/ 2 && t88_value !== (t88_value = /*meal*/ ctx[1].strIngredient18 + "")) set_data_dev(t88, t88_value);
    			if (dirty & /*meal*/ 2 && t90_value !== (t90_value = /*meal*/ ctx[1].strMeasure19 + "")) set_data_dev(t90, t90_value);
    			if (dirty & /*meal*/ 2 && t92_value !== (t92_value = /*meal*/ ctx[1].strIngredient19 + "")) set_data_dev(t92, t92_value);
    			if (dirty & /*meal*/ 2 && t94_value !== (t94_value = /*meal*/ ctx[1].strMeasure20 + "")) set_data_dev(t94, t94_value);
    			if (dirty & /*meal*/ 2 && t96_value !== (t96_value = /*meal*/ ctx[1].strIngredient20 + "")) set_data_dev(t96, t96_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let meal = {};

    	onMount(async function () {
    		const response = await fetch("https://www.themealdb.com/api/json/v1/1/random.php");
    		const json = await response.json();
    		console.log(json.meals[0]);
    		$$invalidate(1, meal = json.meals[0]);
    	});

    	let { appName } = $$props;
    	const writable_props = ["appName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("appName" in $$props) $$invalidate(0, appName = $$props.appName);
    	};

    	$$self.$capture_state = () => {
    		return { meal, appName };
    	};

    	$$self.$inject_state = $$props => {
    		if ("meal" in $$props) $$invalidate(1, meal = $$props.meal);
    		if ("appName" in $$props) $$invalidate(0, appName = $$props.appName);
    	};

    	return [appName, meal];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { appName: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*appName*/ ctx[0] === undefined && !("appName" in props)) {
    			console_1.warn("<App> was created without expected prop 'appName'");
    		}
    	}

    	get appName() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set appName(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		appName: 'Meal Randomizer'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
