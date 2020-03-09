
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
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

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

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

    // (95:1) {:then meal}
    function create_then_block(ctx) {
    	let div2;
    	let div0;
    	let a;
    	let img;
    	let img_src_value;
    	let a_href_value;
    	let t0;
    	let h2;
    	let t2;
    	let ul;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let t20;
    	let t21;
    	let t22;
    	let div1;
    	let h1;
    	let t23_value = /*meal*/ ctx[0].strMeal + "";
    	let t23;
    	let t24;
    	let p0;
    	let t25_value = /*meal*/ ctx[0].idMeal + "";
    	let t25;
    	let t26;
    	let span0;
    	let t27_value = /*meal*/ ctx[0].strCategory + "";
    	let t27;
    	let t28;
    	let span1;
    	let t29_value = /*meal*/ ctx[0].strArea + "";
    	let t29;
    	let t30;
    	let t31;
    	let p1;
    	let t32_value = /*meal*/ ctx[0].strInstructions + "";
    	let t32;
    	let if_block0 = /*meal*/ ctx[0].strMeasure1 && create_if_block_20(ctx);
    	let if_block1 = /*meal*/ ctx[0].strMeasure2 && create_if_block_19(ctx);
    	let if_block2 = /*meal*/ ctx[0].strMeasure3 && create_if_block_18(ctx);
    	let if_block3 = /*meal*/ ctx[0].strMeasure4 && create_if_block_17(ctx);
    	let if_block4 = /*meal*/ ctx[0].strMeasure5 && create_if_block_16(ctx);
    	let if_block5 = /*meal*/ ctx[0].strMeasure6 && create_if_block_15(ctx);
    	let if_block6 = /*meal*/ ctx[0].strMeasure7 && create_if_block_14(ctx);
    	let if_block7 = /*meal*/ ctx[0].strMeasure8 && create_if_block_13(ctx);
    	let if_block8 = /*meal*/ ctx[0].strMeasure9 && create_if_block_12(ctx);
    	let if_block9 = /*meal*/ ctx[0].strMeasure10 && create_if_block_11(ctx);
    	let if_block10 = /*meal*/ ctx[0].strMeasure11 && create_if_block_10(ctx);
    	let if_block11 = /*meal*/ ctx[0].strMeasure12 && create_if_block_9(ctx);
    	let if_block12 = /*meal*/ ctx[0].strMeasure13 && create_if_block_8(ctx);
    	let if_block13 = /*meal*/ ctx[0].strMeasure14 && create_if_block_7(ctx);
    	let if_block14 = /*meal*/ ctx[0].strMeasure15 && create_if_block_6(ctx);
    	let if_block15 = /*meal*/ ctx[0].strMeasure16 && create_if_block_5(ctx);
    	let if_block16 = /*meal*/ ctx[0].strMeasure17 && create_if_block_4(ctx);
    	let if_block17 = /*meal*/ ctx[0].strMeasure18 && create_if_block_3(ctx);
    	let if_block18 = /*meal*/ ctx[0].strMeasure19 && create_if_block_2(ctx);
    	let if_block19 = /*meal*/ ctx[0].strMeasure20 && create_if_block_1(ctx);
    	let if_block20 = /*meal*/ ctx[0].strTags && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Ingredients:";
    			t2 = space();
    			ul = element("ul");
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			if (if_block3) if_block3.c();
    			t6 = space();
    			if (if_block4) if_block4.c();
    			t7 = space();
    			if (if_block5) if_block5.c();
    			t8 = space();
    			if (if_block6) if_block6.c();
    			t9 = space();
    			if (if_block7) if_block7.c();
    			t10 = space();
    			if (if_block8) if_block8.c();
    			t11 = space();
    			if (if_block9) if_block9.c();
    			t12 = space();
    			if (if_block10) if_block10.c();
    			t13 = space();
    			if (if_block11) if_block11.c();
    			t14 = space();
    			if (if_block12) if_block12.c();
    			t15 = space();
    			if (if_block13) if_block13.c();
    			t16 = space();
    			if (if_block14) if_block14.c();
    			t17 = space();
    			if (if_block15) if_block15.c();
    			t18 = space();
    			if (if_block16) if_block16.c();
    			t19 = space();
    			if (if_block17) if_block17.c();
    			t20 = space();
    			if (if_block18) if_block18.c();
    			t21 = space();
    			if (if_block19) if_block19.c();
    			t22 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t23 = text(t23_value);
    			t24 = space();
    			p0 = element("p");
    			t25 = text(t25_value);
    			t26 = space();
    			span0 = element("span");
    			t27 = text(t27_value);
    			t28 = space();
    			span1 = element("span");
    			t29 = text(t29_value);
    			t30 = space();
    			if (if_block20) if_block20.c();
    			t31 = space();
    			p1 = element("p");
    			t32 = text(t32_value);
    			if (img.src !== (img_src_value = /*meal*/ ctx[0].strMealThumb)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Meal Image");
    			attr_dev(img, "class", "meal-image");
    			add_location(img, file, 97, 29, 3748);
    			attr_dev(a, "href", a_href_value = /*meal*/ ctx[0].strSource);
    			add_location(a, file, 97, 4, 3723);
    			add_location(h2, file, 98, 4, 3822);
    			add_location(ul, file, 99, 4, 3848);
    			attr_dev(div0, "class", "column");
    			add_location(div0, file, 96, 3, 3698);
    			attr_dev(h1, "class", "meal-title");
    			add_location(h1, file, 123, 4, 5599);
    			p0.hidden = true;
    			add_location(p0, file, 124, 4, 5646);
    			attr_dev(span0, "class", "badge");
    			add_location(span0, file, 125, 4, 5678);
    			attr_dev(span1, "class", "badge");
    			add_location(span1, file, 126, 4, 5728);
    			attr_dev(p1, "class", "instructions");
    			add_location(p1, file, 132, 4, 5921);
    			add_location(div1, file, 122, 3, 5589);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file, 95, 2, 3671);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, a);
    			append_dev(a, img);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, ul);
    			if (if_block0) if_block0.m(ul, null);
    			append_dev(ul, t3);
    			if (if_block1) if_block1.m(ul, null);
    			append_dev(ul, t4);
    			if (if_block2) if_block2.m(ul, null);
    			append_dev(ul, t5);
    			if (if_block3) if_block3.m(ul, null);
    			append_dev(ul, t6);
    			if (if_block4) if_block4.m(ul, null);
    			append_dev(ul, t7);
    			if (if_block5) if_block5.m(ul, null);
    			append_dev(ul, t8);
    			if (if_block6) if_block6.m(ul, null);
    			append_dev(ul, t9);
    			if (if_block7) if_block7.m(ul, null);
    			append_dev(ul, t10);
    			if (if_block8) if_block8.m(ul, null);
    			append_dev(ul, t11);
    			if (if_block9) if_block9.m(ul, null);
    			append_dev(ul, t12);
    			if (if_block10) if_block10.m(ul, null);
    			append_dev(ul, t13);
    			if (if_block11) if_block11.m(ul, null);
    			append_dev(ul, t14);
    			if (if_block12) if_block12.m(ul, null);
    			append_dev(ul, t15);
    			if (if_block13) if_block13.m(ul, null);
    			append_dev(ul, t16);
    			if (if_block14) if_block14.m(ul, null);
    			append_dev(ul, t17);
    			if (if_block15) if_block15.m(ul, null);
    			append_dev(ul, t18);
    			if (if_block16) if_block16.m(ul, null);
    			append_dev(ul, t19);
    			if (if_block17) if_block17.m(ul, null);
    			append_dev(ul, t20);
    			if (if_block18) if_block18.m(ul, null);
    			append_dev(ul, t21);
    			if (if_block19) if_block19.m(ul, null);
    			append_dev(div2, t22);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t23);
    			append_dev(div1, t24);
    			append_dev(div1, p0);
    			append_dev(p0, t25);
    			append_dev(div1, t26);
    			append_dev(div1, span0);
    			append_dev(span0, t27);
    			append_dev(div1, t28);
    			append_dev(div1, span1);
    			append_dev(span1, t29);
    			append_dev(div1, t30);
    			if (if_block20) if_block20.m(div1, null);
    			append_dev(div1, t31);
    			append_dev(div1, p1);
    			append_dev(p1, t32);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && img.src !== (img_src_value = /*meal*/ ctx[0].strMealThumb)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*meal*/ 1 && a_href_value !== (a_href_value = /*meal*/ ctx[0].strSource)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (/*meal*/ ctx[0].strMeasure1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_20(ctx);
    					if_block0.c();
    					if_block0.m(ul, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure2) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_19(ctx);
    					if_block1.c();
    					if_block1.m(ul, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure3) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_18(ctx);
    					if_block2.c();
    					if_block2.m(ul, t5);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure4) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_17(ctx);
    					if_block3.c();
    					if_block3.m(ul, t6);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure5) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_16(ctx);
    					if_block4.c();
    					if_block4.m(ul, t7);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure6) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_15(ctx);
    					if_block5.c();
    					if_block5.m(ul, t8);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure7) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block_14(ctx);
    					if_block6.c();
    					if_block6.m(ul, t9);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure8) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_13(ctx);
    					if_block7.c();
    					if_block7.m(ul, t10);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure9) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block_12(ctx);
    					if_block8.c();
    					if_block8.m(ul, t11);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure10) {
    				if (if_block9) {
    					if_block9.p(ctx, dirty);
    				} else {
    					if_block9 = create_if_block_11(ctx);
    					if_block9.c();
    					if_block9.m(ul, t12);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure11) {
    				if (if_block10) {
    					if_block10.p(ctx, dirty);
    				} else {
    					if_block10 = create_if_block_10(ctx);
    					if_block10.c();
    					if_block10.m(ul, t13);
    				}
    			} else if (if_block10) {
    				if_block10.d(1);
    				if_block10 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure12) {
    				if (if_block11) {
    					if_block11.p(ctx, dirty);
    				} else {
    					if_block11 = create_if_block_9(ctx);
    					if_block11.c();
    					if_block11.m(ul, t14);
    				}
    			} else if (if_block11) {
    				if_block11.d(1);
    				if_block11 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure13) {
    				if (if_block12) {
    					if_block12.p(ctx, dirty);
    				} else {
    					if_block12 = create_if_block_8(ctx);
    					if_block12.c();
    					if_block12.m(ul, t15);
    				}
    			} else if (if_block12) {
    				if_block12.d(1);
    				if_block12 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure14) {
    				if (if_block13) {
    					if_block13.p(ctx, dirty);
    				} else {
    					if_block13 = create_if_block_7(ctx);
    					if_block13.c();
    					if_block13.m(ul, t16);
    				}
    			} else if (if_block13) {
    				if_block13.d(1);
    				if_block13 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure15) {
    				if (if_block14) {
    					if_block14.p(ctx, dirty);
    				} else {
    					if_block14 = create_if_block_6(ctx);
    					if_block14.c();
    					if_block14.m(ul, t17);
    				}
    			} else if (if_block14) {
    				if_block14.d(1);
    				if_block14 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure16) {
    				if (if_block15) {
    					if_block15.p(ctx, dirty);
    				} else {
    					if_block15 = create_if_block_5(ctx);
    					if_block15.c();
    					if_block15.m(ul, t18);
    				}
    			} else if (if_block15) {
    				if_block15.d(1);
    				if_block15 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure17) {
    				if (if_block16) {
    					if_block16.p(ctx, dirty);
    				} else {
    					if_block16 = create_if_block_4(ctx);
    					if_block16.c();
    					if_block16.m(ul, t19);
    				}
    			} else if (if_block16) {
    				if_block16.d(1);
    				if_block16 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure18) {
    				if (if_block17) {
    					if_block17.p(ctx, dirty);
    				} else {
    					if_block17 = create_if_block_3(ctx);
    					if_block17.c();
    					if_block17.m(ul, t20);
    				}
    			} else if (if_block17) {
    				if_block17.d(1);
    				if_block17 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure19) {
    				if (if_block18) {
    					if_block18.p(ctx, dirty);
    				} else {
    					if_block18 = create_if_block_2(ctx);
    					if_block18.c();
    					if_block18.m(ul, t21);
    				}
    			} else if (if_block18) {
    				if_block18.d(1);
    				if_block18 = null;
    			}

    			if (/*meal*/ ctx[0].strMeasure20) {
    				if (if_block19) {
    					if_block19.p(ctx, dirty);
    				} else {
    					if_block19 = create_if_block_1(ctx);
    					if_block19.c();
    					if_block19.m(ul, null);
    				}
    			} else if (if_block19) {
    				if_block19.d(1);
    				if_block19 = null;
    			}

    			if (dirty & /*meal*/ 1 && t23_value !== (t23_value = /*meal*/ ctx[0].strMeal + "")) set_data_dev(t23, t23_value);
    			if (dirty & /*meal*/ 1 && t25_value !== (t25_value = /*meal*/ ctx[0].idMeal + "")) set_data_dev(t25, t25_value);
    			if (dirty & /*meal*/ 1 && t27_value !== (t27_value = /*meal*/ ctx[0].strCategory + "")) set_data_dev(t27, t27_value);
    			if (dirty & /*meal*/ 1 && t29_value !== (t29_value = /*meal*/ ctx[0].strArea + "")) set_data_dev(t29, t29_value);

    			if (/*meal*/ ctx[0].strTags) {
    				if (if_block20) {
    					if_block20.p(ctx, dirty);
    				} else {
    					if_block20 = create_if_block(ctx);
    					if_block20.c();
    					if_block20.m(div1, t31);
    				}
    			} else if (if_block20) {
    				if_block20.d(1);
    				if_block20 = null;
    			}

    			if (dirty & /*meal*/ 1 && t32_value !== (t32_value = /*meal*/ ctx[0].strInstructions + "")) set_data_dev(t32, t32_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (if_block10) if_block10.d();
    			if (if_block11) if_block11.d();
    			if (if_block12) if_block12.d();
    			if (if_block13) if_block13.d();
    			if (if_block14) if_block14.d();
    			if (if_block15) if_block15.d();
    			if (if_block16) if_block16.d();
    			if (if_block17) if_block17.d();
    			if (if_block18) if_block18.d();
    			if (if_block19) if_block19.d();
    			if (if_block20) if_block20.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(95:1) {:then meal}",
    		ctx
    	});

    	return block;
    }

    // (101:5) {#if meal.strMeasure1}
    function create_if_block_20(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient1 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure1 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 100, 27, 3880);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient1 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure1 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_20.name,
    		type: "if",
    		source: "(101:5) {#if meal.strMeasure1}",
    		ctx
    	});

    	return block;
    }

    // (102:5) {#if meal.strMeasure2}
    function create_if_block_19(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient2 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure2 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 101, 27, 3964);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient2 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure2 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(102:5) {#if meal.strMeasure2}",
    		ctx
    	});

    	return block;
    }

    // (103:5) {#if meal.strMeasure3}
    function create_if_block_18(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient3 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure3 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 102, 27, 4048);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient3 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure3 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(103:5) {#if meal.strMeasure3}",
    		ctx
    	});

    	return block;
    }

    // (104:5) {#if meal.strMeasure4}
    function create_if_block_17(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient4 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure4 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 103, 27, 4132);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient4 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure4 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(104:5) {#if meal.strMeasure4}",
    		ctx
    	});

    	return block;
    }

    // (105:5) {#if meal.strMeasure5}
    function create_if_block_16(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient5 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure5 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 104, 27, 4216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient5 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure5 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(105:5) {#if meal.strMeasure5}",
    		ctx
    	});

    	return block;
    }

    // (106:5) {#if meal.strMeasure6}
    function create_if_block_15(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient6 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure6 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 105, 27, 4300);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient6 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure6 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(106:5) {#if meal.strMeasure6}",
    		ctx
    	});

    	return block;
    }

    // (107:5) {#if meal.strMeasure7}
    function create_if_block_14(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient7 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure7 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 106, 27, 4384);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient7 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure7 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(107:5) {#if meal.strMeasure7}",
    		ctx
    	});

    	return block;
    }

    // (108:5) {#if meal.strMeasure8}
    function create_if_block_13(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient8 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure8 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 107, 27, 4468);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient8 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure8 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(108:5) {#if meal.strMeasure8}",
    		ctx
    	});

    	return block;
    }

    // (109:5) {#if meal.strMeasure9}
    function create_if_block_12(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient9 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure9 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 108, 27, 4552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient9 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure9 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(109:5) {#if meal.strMeasure9}",
    		ctx
    	});

    	return block;
    }

    // (110:5) {#if meal.strMeasure10}
    function create_if_block_11(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient10 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure10 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 109, 28, 4637);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient10 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure10 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(110:5) {#if meal.strMeasure10}",
    		ctx
    	});

    	return block;
    }

    // (111:5) {#if meal.strMeasure11}
    function create_if_block_10(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient11 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure11 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 110, 28, 4724);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient11 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure11 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(111:5) {#if meal.strMeasure11}",
    		ctx
    	});

    	return block;
    }

    // (112:5) {#if meal.strMeasure12}
    function create_if_block_9(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient12 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure12 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 111, 28, 4811);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient12 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure12 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(112:5) {#if meal.strMeasure12}",
    		ctx
    	});

    	return block;
    }

    // (113:5) {#if meal.strMeasure13}
    function create_if_block_8(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient13 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure13 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 112, 28, 4898);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient13 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure13 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(113:5) {#if meal.strMeasure13}",
    		ctx
    	});

    	return block;
    }

    // (114:5) {#if meal.strMeasure14}
    function create_if_block_7(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient14 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure14 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 113, 28, 4985);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient14 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure14 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(114:5) {#if meal.strMeasure14}",
    		ctx
    	});

    	return block;
    }

    // (115:5) {#if meal.strMeasure15}
    function create_if_block_6(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient15 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure15 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 114, 28, 5072);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient15 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure15 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(115:5) {#if meal.strMeasure15}",
    		ctx
    	});

    	return block;
    }

    // (116:5) {#if meal.strMeasure16}
    function create_if_block_5(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient16 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure16 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 115, 28, 5159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient16 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure16 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(116:5) {#if meal.strMeasure16}",
    		ctx
    	});

    	return block;
    }

    // (117:5) {#if meal.strMeasure17}
    function create_if_block_4(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient17 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure17 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 116, 28, 5246);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient17 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure17 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(117:5) {#if meal.strMeasure17}",
    		ctx
    	});

    	return block;
    }

    // (118:5) {#if meal.strMeasure18}
    function create_if_block_3(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient18 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure18 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 117, 28, 5333);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient18 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure18 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(118:5) {#if meal.strMeasure18}",
    		ctx
    	});

    	return block;
    }

    // (119:5) {#if meal.strMeasure19}
    function create_if_block_2(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient19 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure19 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 118, 28, 5420);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient19 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure19 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(119:5) {#if meal.strMeasure19}",
    		ctx
    	});

    	return block;
    }

    // (120:5) {#if meal.strMeasure20}
    function create_if_block_1(ctx) {
    	let li;
    	let t0_value = /*meal*/ ctx[0].strIngredient20 + "";
    	let t0;
    	let t1;
    	let t2_value = /*meal*/ ctx[0].strMeasure20 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 119, 28, 5507);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t0_value !== (t0_value = /*meal*/ ctx[0].strIngredient20 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*meal*/ 1 && t2_value !== (t2_value = /*meal*/ ctx[0].strMeasure20 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(120:5) {#if meal.strMeasure20}",
    		ctx
    	});

    	return block;
    }

    // (128:4) {#if meal.strTags}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*meal*/ ctx[0].strTags.split(",").filter(Boolean);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal, Boolean*/ 1) {
    				each_value = /*meal*/ ctx[0].strTags.split(",").filter(Boolean);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(128:4) {#if meal.strTags}",
    		ctx
    	});

    	return block;
    }

    // (129:5) {#each meal.strTags.split(',').filter(Boolean) as tags}
    function create_each_block(ctx) {
    	let span;
    	let t_value = /*tags*/ ctx[2] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "badge");
    			add_location(span, file, 129, 6, 5860);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meal*/ 1 && t_value !== (t_value = /*tags*/ ctx[2] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(129:5) {#each meal.strTags.split(',').filter(Boolean) as tags}",
    		ctx
    	});

    	return block;
    }

    // (93:14)    <p>Waiting...</p>  {:then meal}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Waiting...";
    			add_location(p, file, 93, 2, 3637);
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
    		source: "(93:14)    <p>Waiting...</p>  {:then meal}",
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
    	let main;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 0
    	};

    	handle_promise(promise = /*meal*/ ctx[0], info);

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
    			span2.textContent = "About";
    			t8 = space();
    			main = element("main");
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
    			attr_dev(path3, "d", "M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z");
    			add_location(path3, file, 79, 5, 3049);
    			attr_dev(svg2, "aria-hidden", "true");
    			attr_dev(svg2, "focusable", "false");
    			attr_dev(svg2, "data-prefix", "fas");
    			attr_dev(svg2, "data-icon", "info-circle");
    			attr_dev(svg2, "role", "img");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "viewBox", "0 0 512 512");
    			attr_dev(svg2, "class", "svg-inline--fa fa-info-circle fa-w-16");
    			add_location(svg2, file, 70, 4, 2805);
    			attr_dev(span2, "class", "link-text");
    			add_location(span2, file, 85, 4, 3545);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "nav-link");
    			add_location(a2, file, 69, 3, 2771);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file, 68, 2, 2746);
    			attr_dev(ul, "class", "navbar-nav");
    			add_location(ul, file, 20, 1, 395);
    			attr_dev(nav, "class", "navbar");
    			add_location(nav, file, 19, 0, 373);
    			add_location(main, file, 91, 0, 3613);
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
    			insert_dev(target, t8, anchor);
    			insert_dev(target, main, anchor);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*meal*/ 1 && promise !== (promise = /*meal*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[0] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t8);
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
    		$$invalidate(0, meal = getRandomMeal());
    	});

    	let { appName } = $$props;
    	const writable_props = ["appName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("appName" in $$props) $$invalidate(1, appName = $$props.appName);
    	};

    	$$self.$capture_state = () => {
    		return { meal, appName };
    	};

    	$$self.$inject_state = $$props => {
    		if ("meal" in $$props) $$invalidate(0, meal = $$props.meal);
    		if ("appName" in $$props) $$invalidate(1, appName = $$props.appName);
    	};

    	return [meal, appName];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { appName: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*appName*/ ctx[1] === undefined && !("appName" in props)) {
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
