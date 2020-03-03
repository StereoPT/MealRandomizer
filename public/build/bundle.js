
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
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
    const file = "src\\App.svelte";

    // (1:0) <script>  import { onMount }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>  import { onMount }",
    		ctx
    	});

    	return block;
    }

    // (137:1) {:then meal}
    function create_then_block(ctx) {
    	let p0;
    	let t0_value = /*meal*/ ctx[1].idMeal + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let p1;
    	let t3_value = /*meal*/ ctx[1].strMeal + "";
    	let t3;
    	let t4;
    	let p2;
    	let t5_value = /*meal*/ ctx[1].strCategory + "";
    	let t5;
    	let t6;
    	let p3;
    	let t7_value = /*meal*/ ctx[1].strArea + "";
    	let t7;
    	let t8;
    	let p4;
    	let t9_value = /*meal*/ ctx[1].strInstructions + "";
    	let t9;
    	let t10;
    	let p5;
    	let t11_value = /*meal*/ ctx[1].strTags + "";
    	let t11;
    	let t12;
    	let a;
    	let t13_value = /*meal*/ ctx[1].strSource + "";
    	let t13;
    	let a_href_value;
    	let t14;
    	let ul;
    	let li0;
    	let t15_value = /*meal*/ ctx[1].strMeasure1 + "";
    	let t15;
    	let t16;
    	let t17_value = /*meal*/ ctx[1].strIngredient1 + "";
    	let t17;
    	let t18;
    	let li1;
    	let t19_value = /*meal*/ ctx[1].strMeasure2 + "";
    	let t19;
    	let t20;
    	let t21_value = /*meal*/ ctx[1].strIngredient2 + "";
    	let t21;
    	let t22;
    	let li2;
    	let t23_value = /*meal*/ ctx[1].strMeasure3 + "";
    	let t23;
    	let t24;
    	let t25_value = /*meal*/ ctx[1].strIngredient3 + "";
    	let t25;
    	let t26;
    	let li3;
    	let t27_value = /*meal*/ ctx[1].strMeasure4 + "";
    	let t27;
    	let t28;
    	let t29_value = /*meal*/ ctx[1].strIngredient4 + "";
    	let t29;
    	let t30;
    	let li4;
    	let t31_value = /*meal*/ ctx[1].strMeasure5 + "";
    	let t31;
    	let t32;
    	let t33_value = /*meal*/ ctx[1].strIngredient5 + "";
    	let t33;
    	let t34;
    	let li5;
    	let t35_value = /*meal*/ ctx[1].strMeasure6 + "";
    	let t35;
    	let t36;
    	let t37_value = /*meal*/ ctx[1].strIngredient6 + "";
    	let t37;
    	let t38;
    	let li6;
    	let t39_value = /*meal*/ ctx[1].strMeasure7 + "";
    	let t39;
    	let t40;
    	let t41_value = /*meal*/ ctx[1].strIngredient7 + "";
    	let t41;
    	let t42;
    	let li7;
    	let t43_value = /*meal*/ ctx[1].strMeasure8 + "";
    	let t43;
    	let t44;
    	let t45_value = /*meal*/ ctx[1].strIngredient8 + "";
    	let t45;
    	let t46;
    	let li8;
    	let t47_value = /*meal*/ ctx[1].strMeasure9 + "";
    	let t47;
    	let t48;
    	let t49_value = /*meal*/ ctx[1].strIngredient9 + "";
    	let t49;
    	let t50;
    	let li9;
    	let t51_value = /*meal*/ ctx[1].strMeasure10 + "";
    	let t51;
    	let t52;
    	let t53_value = /*meal*/ ctx[1].strIngredient10 + "";
    	let t53;
    	let t54;
    	let li10;
    	let t55_value = /*meal*/ ctx[1].strMeasure11 + "";
    	let t55;
    	let t56;
    	let t57_value = /*meal*/ ctx[1].strIngredient11 + "";
    	let t57;
    	let t58;
    	let li11;
    	let t59_value = /*meal*/ ctx[1].strMeasure12 + "";
    	let t59;
    	let t60;
    	let t61_value = /*meal*/ ctx[1].strIngredient12 + "";
    	let t61;
    	let t62;
    	let li12;
    	let t63_value = /*meal*/ ctx[1].strMeasure13 + "";
    	let t63;
    	let t64;
    	let t65_value = /*meal*/ ctx[1].strIngredient13 + "";
    	let t65;
    	let t66;
    	let li13;
    	let t67_value = /*meal*/ ctx[1].strMeasure14 + "";
    	let t67;
    	let t68;
    	let t69_value = /*meal*/ ctx[1].strIngredient14 + "";
    	let t69;
    	let t70;
    	let li14;
    	let t71_value = /*meal*/ ctx[1].strMeasure15 + "";
    	let t71;
    	let t72;
    	let t73_value = /*meal*/ ctx[1].strIngredient15 + "";
    	let t73;
    	let t74;
    	let li15;
    	let t75_value = /*meal*/ ctx[1].strMeasure16 + "";
    	let t75;
    	let t76;
    	let t77_value = /*meal*/ ctx[1].strIngredient16 + "";
    	let t77;
    	let t78;
    	let li16;
    	let t79_value = /*meal*/ ctx[1].strMeasure17 + "";
    	let t79;
    	let t80;
    	let t81_value = /*meal*/ ctx[1].strIngredient17 + "";
    	let t81;
    	let t82;
    	let li17;
    	let t83_value = /*meal*/ ctx[1].strMeasure18 + "";
    	let t83;
    	let t84;
    	let t85_value = /*meal*/ ctx[1].strIngredient18 + "";
    	let t85;
    	let t86;
    	let li18;
    	let t87_value = /*meal*/ ctx[1].strMeasure19 + "";
    	let t87;
    	let t88;
    	let t89_value = /*meal*/ ctx[1].strIngredient19 + "";
    	let t89;
    	let t90;
    	let li19;
    	let t91_value = /*meal*/ ctx[1].strMeasure20 + "";
    	let t91;
    	let t92;
    	let t93_value = /*meal*/ ctx[1].strIngredient20 + "";
    	let t93;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			p1 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			p2 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			p3 = element("p");
    			t7 = text(t7_value);
    			t8 = space();
    			p4 = element("p");
    			t9 = text(t9_value);
    			t10 = space();
    			p5 = element("p");
    			t11 = text(t11_value);
    			t12 = space();
    			a = element("a");
    			t13 = text(t13_value);
    			t14 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t15 = text(t15_value);
    			t16 = text(" - ");
    			t17 = text(t17_value);
    			t18 = space();
    			li1 = element("li");
    			t19 = text(t19_value);
    			t20 = text(" - ");
    			t21 = text(t21_value);
    			t22 = space();
    			li2 = element("li");
    			t23 = text(t23_value);
    			t24 = text(" - ");
    			t25 = text(t25_value);
    			t26 = space();
    			li3 = element("li");
    			t27 = text(t27_value);
    			t28 = text(" - ");
    			t29 = text(t29_value);
    			t30 = space();
    			li4 = element("li");
    			t31 = text(t31_value);
    			t32 = text(" - ");
    			t33 = text(t33_value);
    			t34 = space();
    			li5 = element("li");
    			t35 = text(t35_value);
    			t36 = text(" - ");
    			t37 = text(t37_value);
    			t38 = space();
    			li6 = element("li");
    			t39 = text(t39_value);
    			t40 = text(" - ");
    			t41 = text(t41_value);
    			t42 = space();
    			li7 = element("li");
    			t43 = text(t43_value);
    			t44 = text(" - ");
    			t45 = text(t45_value);
    			t46 = space();
    			li8 = element("li");
    			t47 = text(t47_value);
    			t48 = text(" - ");
    			t49 = text(t49_value);
    			t50 = space();
    			li9 = element("li");
    			t51 = text(t51_value);
    			t52 = text(" - ");
    			t53 = text(t53_value);
    			t54 = space();
    			li10 = element("li");
    			t55 = text(t55_value);
    			t56 = text(" - ");
    			t57 = text(t57_value);
    			t58 = space();
    			li11 = element("li");
    			t59 = text(t59_value);
    			t60 = text(" - ");
    			t61 = text(t61_value);
    			t62 = space();
    			li12 = element("li");
    			t63 = text(t63_value);
    			t64 = text(" - ");
    			t65 = text(t65_value);
    			t66 = space();
    			li13 = element("li");
    			t67 = text(t67_value);
    			t68 = text(" - ");
    			t69 = text(t69_value);
    			t70 = space();
    			li14 = element("li");
    			t71 = text(t71_value);
    			t72 = text(" - ");
    			t73 = text(t73_value);
    			t74 = space();
    			li15 = element("li");
    			t75 = text(t75_value);
    			t76 = text(" - ");
    			t77 = text(t77_value);
    			t78 = space();
    			li16 = element("li");
    			t79 = text(t79_value);
    			t80 = text(" - ");
    			t81 = text(t81_value);
    			t82 = space();
    			li17 = element("li");
    			t83 = text(t83_value);
    			t84 = text(" - ");
    			t85 = text(t85_value);
    			t86 = space();
    			li18 = element("li");
    			t87 = text(t87_value);
    			t88 = text(" - ");
    			t89 = text(t89_value);
    			t90 = space();
    			li19 = element("li");
    			t91 = text(t91_value);
    			t92 = text(" - ");
    			t93 = text(t93_value);
    			add_location(p0, file, 137, 2, 6193);
    			if (img.src !== (img_src_value = /*meal*/ ctx[1].strMealThumb)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Meal Image");
    			add_location(img, file, 138, 2, 6216);
    			add_location(p1, file, 139, 2, 6266);
    			add_location(p2, file, 140, 2, 6290);
    			add_location(p3, file, 141, 2, 6318);
    			add_location(p4, file, 142, 2, 6342);
    			add_location(p5, file, 143, 2, 6374);
    			attr_dev(a, "href", a_href_value = /*meal*/ ctx[1].strSource);
    			add_location(a, file, 144, 2, 6398);
    			add_location(li0, file, 147, 3, 6455);
    			add_location(li1, file, 148, 3, 6510);
    			add_location(li2, file, 149, 3, 6565);
    			add_location(li3, file, 150, 3, 6620);
    			add_location(li4, file, 151, 3, 6675);
    			add_location(li5, file, 152, 3, 6730);
    			add_location(li6, file, 153, 3, 6785);
    			add_location(li7, file, 154, 3, 6840);
    			add_location(li8, file, 155, 3, 6895);
    			add_location(li9, file, 156, 3, 6950);
    			add_location(li10, file, 157, 3, 7007);
    			add_location(li11, file, 158, 3, 7064);
    			add_location(li12, file, 159, 3, 7121);
    			add_location(li13, file, 160, 3, 7178);
    			add_location(li14, file, 161, 3, 7235);
    			add_location(li15, file, 162, 3, 7292);
    			add_location(li16, file, 163, 3, 7349);
    			add_location(li17, file, 164, 3, 7406);
    			add_location(li18, file, 165, 3, 7463);
    			add_location(li19, file, 166, 3, 7520);
    			add_location(ul, file, 146, 2, 6447);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p4, anchor);
    			append_dev(p4, t9);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, p5, anchor);
    			append_dev(p5, t11);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, a, anchor);
    			append_dev(a, t13);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, t15);
    			append_dev(li0, t16);
    			append_dev(li0, t17);
    			append_dev(ul, t18);
    			append_dev(ul, li1);
    			append_dev(li1, t19);
    			append_dev(li1, t20);
    			append_dev(li1, t21);
    			append_dev(ul, t22);
    			append_dev(ul, li2);
    			append_dev(li2, t23);
    			append_dev(li2, t24);
    			append_dev(li2, t25);
    			append_dev(ul, t26);
    			append_dev(ul, li3);
    			append_dev(li3, t27);
    			append_dev(li3, t28);
    			append_dev(li3, t29);
    			append_dev(ul, t30);
    			append_dev(ul, li4);
    			append_dev(li4, t31);
    			append_dev(li4, t32);
    			append_dev(li4, t33);
    			append_dev(ul, t34);
    			append_dev(ul, li5);
    			append_dev(li5, t35);
    			append_dev(li5, t36);
    			append_dev(li5, t37);
    			append_dev(ul, t38);
    			append_dev(ul, li6);
    			append_dev(li6, t39);
    			append_dev(li6, t40);
    			append_dev(li6, t41);
    			append_dev(ul, t42);
    			append_dev(ul, li7);
    			append_dev(li7, t43);
    			append_dev(li7, t44);
    			append_dev(li7, t45);
    			append_dev(ul, t46);
    			append_dev(ul, li8);
    			append_dev(li8, t47);
    			append_dev(li8, t48);
    			append_dev(li8, t49);
    			append_dev(ul, t50);
    			append_dev(ul, li9);
    			append_dev(li9, t51);
    			append_dev(li9, t52);
    			append_dev(li9, t53);
    			append_dev(ul, t54);
    			append_dev(ul, li10);
    			append_dev(li10, t55);
    			append_dev(li10, t56);
    			append_dev(li10, t57);
    			append_dev(ul, t58);
    			append_dev(ul, li11);
    			append_dev(li11, t59);
    			append_dev(li11, t60);
    			append_dev(li11, t61);
    			append_dev(ul, t62);
    			append_dev(ul, li12);
    			append_dev(li12, t63);
    			append_dev(li12, t64);
    			append_dev(li12, t65);
    			append_dev(ul, t66);
    			append_dev(ul, li13);
    			append_dev(li13, t67);
    			append_dev(li13, t68);
    			append_dev(li13, t69);
    			append_dev(ul, t70);
    			append_dev(ul, li14);
    			append_dev(li14, t71);
    			append_dev(li14, t72);
    			append_dev(li14, t73);
    			append_dev(ul, t74);
    			append_dev(ul, li15);
    			append_dev(li15, t75);
    			append_dev(li15, t76);
    			append_dev(li15, t77);
    			append_dev(ul, t78);
    			append_dev(ul, li16);
    			append_dev(li16, t79);
    			append_dev(li16, t80);
    			append_dev(li16, t81);
    			append_dev(ul, t82);
    			append_dev(ul, li17);
    			append_dev(li17, t83);
    			append_dev(li17, t84);
    			append_dev(li17, t85);
    			append_dev(ul, t86);
    			append_dev(ul, li18);
    			append_dev(li18, t87);
    			append_dev(li18, t88);
    			append_dev(li18, t89);
    			append_dev(ul, t90);
    			append_dev(ul, li19);
    			append_dev(li19, t91);
    			append_dev(li19, t92);
    			append_dev(li19, t93);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 2 && t0_value !== (t0_value = /*meal*/ ctx[1].idMeal + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*meal*/ 2 && img.src !== (img_src_value = /*meal*/ ctx[1].strMealThumb)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*meal*/ 2 && t3_value !== (t3_value = /*meal*/ ctx[1].strMeal + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*meal*/ 2 && t5_value !== (t5_value = /*meal*/ ctx[1].strCategory + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*meal*/ 2 && t7_value !== (t7_value = /*meal*/ ctx[1].strArea + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*meal*/ 2 && t9_value !== (t9_value = /*meal*/ ctx[1].strInstructions + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*meal*/ 2 && t11_value !== (t11_value = /*meal*/ ctx[1].strTags + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*meal*/ 2 && t13_value !== (t13_value = /*meal*/ ctx[1].strSource + "")) set_data_dev(t13, t13_value);

    			if (dirty & /*meal*/ 2 && a_href_value !== (a_href_value = /*meal*/ ctx[1].strSource)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*meal*/ 2 && t15_value !== (t15_value = /*meal*/ ctx[1].strMeasure1 + "")) set_data_dev(t15, t15_value);
    			if (dirty & /*meal*/ 2 && t17_value !== (t17_value = /*meal*/ ctx[1].strIngredient1 + "")) set_data_dev(t17, t17_value);
    			if (dirty & /*meal*/ 2 && t19_value !== (t19_value = /*meal*/ ctx[1].strMeasure2 + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*meal*/ 2 && t21_value !== (t21_value = /*meal*/ ctx[1].strIngredient2 + "")) set_data_dev(t21, t21_value);
    			if (dirty & /*meal*/ 2 && t23_value !== (t23_value = /*meal*/ ctx[1].strMeasure3 + "")) set_data_dev(t23, t23_value);
    			if (dirty & /*meal*/ 2 && t25_value !== (t25_value = /*meal*/ ctx[1].strIngredient3 + "")) set_data_dev(t25, t25_value);
    			if (dirty & /*meal*/ 2 && t27_value !== (t27_value = /*meal*/ ctx[1].strMeasure4 + "")) set_data_dev(t27, t27_value);
    			if (dirty & /*meal*/ 2 && t29_value !== (t29_value = /*meal*/ ctx[1].strIngredient4 + "")) set_data_dev(t29, t29_value);
    			if (dirty & /*meal*/ 2 && t31_value !== (t31_value = /*meal*/ ctx[1].strMeasure5 + "")) set_data_dev(t31, t31_value);
    			if (dirty & /*meal*/ 2 && t33_value !== (t33_value = /*meal*/ ctx[1].strIngredient5 + "")) set_data_dev(t33, t33_value);
    			if (dirty & /*meal*/ 2 && t35_value !== (t35_value = /*meal*/ ctx[1].strMeasure6 + "")) set_data_dev(t35, t35_value);
    			if (dirty & /*meal*/ 2 && t37_value !== (t37_value = /*meal*/ ctx[1].strIngredient6 + "")) set_data_dev(t37, t37_value);
    			if (dirty & /*meal*/ 2 && t39_value !== (t39_value = /*meal*/ ctx[1].strMeasure7 + "")) set_data_dev(t39, t39_value);
    			if (dirty & /*meal*/ 2 && t41_value !== (t41_value = /*meal*/ ctx[1].strIngredient7 + "")) set_data_dev(t41, t41_value);
    			if (dirty & /*meal*/ 2 && t43_value !== (t43_value = /*meal*/ ctx[1].strMeasure8 + "")) set_data_dev(t43, t43_value);
    			if (dirty & /*meal*/ 2 && t45_value !== (t45_value = /*meal*/ ctx[1].strIngredient8 + "")) set_data_dev(t45, t45_value);
    			if (dirty & /*meal*/ 2 && t47_value !== (t47_value = /*meal*/ ctx[1].strMeasure9 + "")) set_data_dev(t47, t47_value);
    			if (dirty & /*meal*/ 2 && t49_value !== (t49_value = /*meal*/ ctx[1].strIngredient9 + "")) set_data_dev(t49, t49_value);
    			if (dirty & /*meal*/ 2 && t51_value !== (t51_value = /*meal*/ ctx[1].strMeasure10 + "")) set_data_dev(t51, t51_value);
    			if (dirty & /*meal*/ 2 && t53_value !== (t53_value = /*meal*/ ctx[1].strIngredient10 + "")) set_data_dev(t53, t53_value);
    			if (dirty & /*meal*/ 2 && t55_value !== (t55_value = /*meal*/ ctx[1].strMeasure11 + "")) set_data_dev(t55, t55_value);
    			if (dirty & /*meal*/ 2 && t57_value !== (t57_value = /*meal*/ ctx[1].strIngredient11 + "")) set_data_dev(t57, t57_value);
    			if (dirty & /*meal*/ 2 && t59_value !== (t59_value = /*meal*/ ctx[1].strMeasure12 + "")) set_data_dev(t59, t59_value);
    			if (dirty & /*meal*/ 2 && t61_value !== (t61_value = /*meal*/ ctx[1].strIngredient12 + "")) set_data_dev(t61, t61_value);
    			if (dirty & /*meal*/ 2 && t63_value !== (t63_value = /*meal*/ ctx[1].strMeasure13 + "")) set_data_dev(t63, t63_value);
    			if (dirty & /*meal*/ 2 && t65_value !== (t65_value = /*meal*/ ctx[1].strIngredient13 + "")) set_data_dev(t65, t65_value);
    			if (dirty & /*meal*/ 2 && t67_value !== (t67_value = /*meal*/ ctx[1].strMeasure14 + "")) set_data_dev(t67, t67_value);
    			if (dirty & /*meal*/ 2 && t69_value !== (t69_value = /*meal*/ ctx[1].strIngredient14 + "")) set_data_dev(t69, t69_value);
    			if (dirty & /*meal*/ 2 && t71_value !== (t71_value = /*meal*/ ctx[1].strMeasure15 + "")) set_data_dev(t71, t71_value);
    			if (dirty & /*meal*/ 2 && t73_value !== (t73_value = /*meal*/ ctx[1].strIngredient15 + "")) set_data_dev(t73, t73_value);
    			if (dirty & /*meal*/ 2 && t75_value !== (t75_value = /*meal*/ ctx[1].strMeasure16 + "")) set_data_dev(t75, t75_value);
    			if (dirty & /*meal*/ 2 && t77_value !== (t77_value = /*meal*/ ctx[1].strIngredient16 + "")) set_data_dev(t77, t77_value);
    			if (dirty & /*meal*/ 2 && t79_value !== (t79_value = /*meal*/ ctx[1].strMeasure17 + "")) set_data_dev(t79, t79_value);
    			if (dirty & /*meal*/ 2 && t81_value !== (t81_value = /*meal*/ ctx[1].strIngredient17 + "")) set_data_dev(t81, t81_value);
    			if (dirty & /*meal*/ 2 && t83_value !== (t83_value = /*meal*/ ctx[1].strMeasure18 + "")) set_data_dev(t83, t83_value);
    			if (dirty & /*meal*/ 2 && t85_value !== (t85_value = /*meal*/ ctx[1].strIngredient18 + "")) set_data_dev(t85, t85_value);
    			if (dirty & /*meal*/ 2 && t87_value !== (t87_value = /*meal*/ ctx[1].strMeasure19 + "")) set_data_dev(t87, t87_value);
    			if (dirty & /*meal*/ 2 && t89_value !== (t89_value = /*meal*/ ctx[1].strIngredient19 + "")) set_data_dev(t89, t89_value);
    			if (dirty & /*meal*/ 2 && t91_value !== (t91_value = /*meal*/ ctx[1].strMeasure20 + "")) set_data_dev(t91, t91_value);
    			if (dirty & /*meal*/ 2 && t93_value !== (t93_value = /*meal*/ ctx[1].strIngredient20 + "")) set_data_dev(t93, t93_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(p4);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(p5);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(a);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(137:1) {:then meal}",
    		ctx
    	});

    	return block;
    }

    // (135:14)    <p>Waiting...</p>  {:then meal}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Waiting...";
    			add_location(p, file, 135, 2, 6159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(135:14)    <p>Waiting...</p>  {:then meal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let span0;
    	let t1;
    	let svg0;
    	let g;
    	let path0;
    	let path1;
    	let t2;
    	let li1;
    	let a1;
    	let svg1;
    	let path2;
    	let t3;
    	let span1;
    	let t5;
    	let li2;
    	let a2;
    	let svg2;
    	let path3;
    	let t6;
    	let span2;
    	let t8;
    	let li3;
    	let a3;
    	let svg3;
    	let path4;
    	let t9;
    	let span3;
    	let t11;
    	let li4;
    	let a4;
    	let svg4;
    	let path5;
    	let t12;
    	let span4;
    	let t14;
    	let main;
    	let h1;
    	let t15;
    	let t16;
    	let t17;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 1
    	};

    	handle_promise(promise = /*meal*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			span0 = element("span");
    			span0.textContent = "MealRandomizer";
    			t1 = space();
    			svg0 = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			t2 = space();
    			li1 = element("li");
    			a1 = element("a");
    			svg1 = svg_element("svg");
    			path2 = svg_element("path");
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = "Random";
    			t5 = space();
    			li2 = element("li");
    			a2 = element("a");
    			svg2 = svg_element("svg");
    			path3 = svg_element("path");
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "Random";
    			t8 = space();
    			li3 = element("li");
    			a3 = element("a");
    			svg3 = svg_element("svg");
    			path4 = svg_element("path");
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "Random";
    			t11 = space();
    			li4 = element("li");
    			a4 = element("a");
    			svg4 = svg_element("svg");
    			path5 = svg_element("path");
    			t12 = space();
    			span4 = element("span");
    			span4.textContent = "Random";
    			t14 = space();
    			main = element("main");
    			h1 = element("h1");
    			t15 = text(/*appName*/ ctx[0]);
    			t16 = text("!");
    			t17 = space();
    			info.block.c();
    			attr_dev(span0, "class", "link-text");
    			add_location(span0, file, 23, 4, 476);
    			attr_dev(path0, "fill", "currentColor");
    			attr_dev(path0, "d", "M224 273L88.37 409a23.78 23.78 0 0 1-33.8 0L32 386.36a23.94 23.94 0 0 1 0-33.89l96.13-96.37L32 159.73a23.94 23.94 0 0 1 0-33.89l22.44-22.79a23.78 23.78 0 0 1 33.8 0L223.88 239a23.94 23.94 0 0 1 .1 34z");
    			attr_dev(path0, "class", "fa-secondary");
    			add_location(path0, file, 34, 17, 909);
    			attr_dev(path1, "fill", "currentColor");
    			attr_dev(path1, "d", "M415.89 273L280.34 409a23.77 23.77 0 0 1-33.79 0L224 386.26a23.94 23.94 0 0 1 0-33.89L320.11 256l-96-96.47a23.94 23.94 0 0 1 0-33.89l22.52-22.59a23.77 23.77 0 0 1 33.79 0L416 239a24 24 0 0 1-.11 34z");
    			attr_dev(path1, "class", "fa-primary");
    			add_location(path1, file, 39, 17, 1250);
    			attr_dev(g, "class", "fa-group");
    			add_location(g, file, 33, 14, 871);
    			attr_dev(svg0, "aria-hidden", "true");
    			attr_dev(svg0, "focusable", "false");
    			attr_dev(svg0, "data-prefix", "fad");
    			attr_dev(svg0, "data-icon", "angle-double-right");
    			attr_dev(svg0, "role", "img");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 448 512");
    			attr_dev(svg0, "class", "svg-inline--fa fa-angle-double-right fa-w-14 fa-5x");
    			add_location(svg0, file, 24, 4, 526);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "nav-link");
    			add_location(a0, file, 22, 3, 442);
    			attr_dev(li0, "class", "logo");
    			add_location(li0, file, 21, 2, 421);
    			attr_dev(path2, "fill", "currentColor");
    			attr_dev(path2, "class", "fa-primary");
    			attr_dev(path2, "d", "M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z");
    			add_location(path2, file, 59, 5, 1921);
    			attr_dev(svg1, "aria-hidden", "true");
    			attr_dev(svg1, "focusable", "false");
    			attr_dev(svg1, "data-prefix", "fas");
    			attr_dev(svg1, "data-icon", "random");
    			attr_dev(svg1, "role", "img");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 512 512");
    			attr_dev(svg1, "class", "svg-inline--fa fa-random fa-w-16");
    			add_location(svg1, file, 50, 4, 1687);
    			attr_dev(span1, "class", "link-text");
    			add_location(span1, file, 65, 4, 2690);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "nav-link");
    			add_location(a1, file, 49, 3, 1653);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file, 48, 2, 1628);
    			attr_dev(path3, "fill", "currentColor");
    			attr_dev(path3, "class", "fa-primary");
    			attr_dev(path3, "d", "M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z");
    			add_location(path3, file, 79, 5, 3039);
    			attr_dev(svg2, "aria-hidden", "true");
    			attr_dev(svg2, "focusable", "false");
    			attr_dev(svg2, "data-prefix", "fas");
    			attr_dev(svg2, "data-icon", "random");
    			attr_dev(svg2, "role", "img");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "viewBox", "0 0 512 512");
    			attr_dev(svg2, "class", "svg-inline--fa fa-random fa-w-16");
    			add_location(svg2, file, 70, 4, 2805);
    			attr_dev(span2, "class", "link-text");
    			add_location(span2, file, 85, 4, 3808);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "nav-link");
    			add_location(a2, file, 69, 3, 2771);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file, 68, 2, 2746);
    			attr_dev(path4, "fill", "currentColor");
    			attr_dev(path4, "class", "fa-primary");
    			attr_dev(path4, "d", "M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z");
    			add_location(path4, file, 99, 5, 4157);
    			attr_dev(svg3, "aria-hidden", "true");
    			attr_dev(svg3, "focusable", "false");
    			attr_dev(svg3, "data-prefix", "fas");
    			attr_dev(svg3, "data-icon", "random");
    			attr_dev(svg3, "role", "img");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "viewBox", "0 0 512 512");
    			attr_dev(svg3, "class", "svg-inline--fa fa-random fa-w-16");
    			add_location(svg3, file, 90, 4, 3923);
    			attr_dev(span3, "class", "link-text");
    			add_location(span3, file, 105, 4, 4926);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "nav-link");
    			add_location(a3, file, 89, 3, 3889);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file, 88, 2, 3864);
    			attr_dev(path5, "fill", "currentColor");
    			attr_dev(path5, "class", "fa-primary");
    			attr_dev(path5, "d", "M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z");
    			add_location(path5, file, 119, 5, 5275);
    			attr_dev(svg4, "aria-hidden", "true");
    			attr_dev(svg4, "focusable", "false");
    			attr_dev(svg4, "data-prefix", "fas");
    			attr_dev(svg4, "data-icon", "random");
    			attr_dev(svg4, "role", "img");
    			attr_dev(svg4, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg4, "viewBox", "0 0 512 512");
    			attr_dev(svg4, "class", "svg-inline--fa fa-random fa-w-16");
    			add_location(svg4, file, 110, 4, 5041);
    			attr_dev(span4, "class", "link-text");
    			add_location(span4, file, 125, 4, 6044);
    			attr_dev(a4, "href", "#");
    			attr_dev(a4, "class", "nav-link");
    			add_location(a4, file, 109, 3, 5007);
    			attr_dev(li4, "class", "nav-item");
    			add_location(li4, file, 108, 2, 4982);
    			attr_dev(ul, "class", "navbar-nav");
    			add_location(ul, file, 20, 1, 395);
    			attr_dev(nav, "class", "navbar");
    			add_location(nav, file, 19, 0, 373);
    			add_location(h1, file, 132, 1, 6121);
    			add_location(main, file, 131, 0, 6113);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(a0, span0);
    			append_dev(a0, t1);
    			append_dev(a0, svg0);
    			append_dev(svg0, g);
    			append_dev(g, path0);
    			append_dev(g, path1);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, svg1);
    			append_dev(svg1, path2);
    			append_dev(a1, t3);
    			append_dev(a1, span1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(a2, svg2);
    			append_dev(svg2, path3);
    			append_dev(a2, t6);
    			append_dev(a2, span2);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(li3, a3);
    			append_dev(a3, svg3);
    			append_dev(svg3, path4);
    			append_dev(a3, t9);
    			append_dev(a3, span3);
    			append_dev(ul, t11);
    			append_dev(ul, li4);
    			append_dev(li4, a4);
    			append_dev(a4, svg4);
    			append_dev(svg4, path5);
    			append_dev(a4, t12);
    			append_dev(a4, span4);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t15);
    			append_dev(h1, t16);
    			append_dev(main, t17);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*appName*/ 1) set_data_dev(t15, /*appName*/ ctx[0]);
    			info.ctx = ctx;

    			if (dirty & /*meal*/ 2 && promise !== (promise = /*meal*/ ctx[1]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[1] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
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

    async function getRandomMeal() {
    	const response = await fetch("https://www.themealdb.com/api/json/v1/1/random.php");
    	const json = await response.json();
    	return json.meals[0];
    }

    function instance($$self, $$props, $$invalidate) {
    	let meal = {};

    	onMount(async function () {
    		$$invalidate(1, meal = getRandomMeal());
    	});

    	let { appName } = $$props;
    	const writable_props = ["appName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
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
    			console.warn("<App> was created without expected prop 'appName'");
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
