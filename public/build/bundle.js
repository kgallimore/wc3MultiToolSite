
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.42.4 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i][0];
    	child_ctx[15] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (112:4) {:else}
    function create_else_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Could not fetch latest version");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(112:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (110:4) {#if latestDownloadURL}
    function create_if_block_4(ctx) {
    	let a;
    	let t0;
    	let t1;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text("Download ");
    			t1 = text(/*latestVersion*/ ctx[4]);
    			attr_dev(a, "href", a_href_value = "/publish/" + /*latestDownloadURL*/ ctx[3]);
    			add_location(a, file, 110, 6, 3381);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*latestVersion*/ 16) set_data_dev(t1, /*latestVersion*/ ctx[4]);

    			if (dirty & /*latestDownloadURL*/ 8 && a_href_value !== (a_href_value = "/publish/" + /*latestDownloadURL*/ ctx[3])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(110:4) {#if latestDownloadURL}",
    		ctx
    	});

    	return block;
    }

    // (145:12) {:else}
    function create_else_block_3(ctx) {
    	let t_value = /*lobbyData*/ ctx[8].mapName + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t_value !== (t_value = /*lobbyData*/ ctx[8].mapName + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(145:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (143:12) {#if lobbyData.mapNameClean}
    function create_if_block_3(ctx) {
    	let t_value = /*lobbyData*/ ctx[8].mapNameClean + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t_value !== (t_value = /*lobbyData*/ ctx[8].mapNameClean + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(143:12) {#if lobbyData.mapNameClean}",
    		ctx
    	});

    	return block;
    }

    // (156:16) {:else}
    function create_else_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Waiting for data");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(156:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (153:16) {#if lobbyData.teamData}
    function create_if_block_2(ctx) {
    	let t0_value = /*lobbyData*/ ctx[8].teamData.filledPlayableSlots + "";
    	let t0;
    	let t1;
    	let t2_value = /*lobbyData*/ ctx[8].teamData.playableSlots + "";
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text("/");
    			t2 = text(t2_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t0_value !== (t0_value = /*lobbyData*/ ctx[8].teamData.filledPlayableSlots + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*lobbies*/ 4 && t2_value !== (t2_value = /*lobbyData*/ ctx[8].teamData.playableSlots + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(153:16) {#if lobbyData.teamData}",
    		ctx
    	});

    	return block;
    }

    // (176:26) {:else}
    function create_else_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("N/A");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(176:26) {:else}",
    		ctx
    	});

    	return block;
    }

    // (174:26) {#if lobbyData.processed.eloList[slot]}
    function create_if_block_1(ctx) {
    	let t_value = /*lobbyData*/ ctx[8].processed.eloList[/*slot*/ ctx[18]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t_value !== (t_value = /*lobbyData*/ ctx[8].processed.eloList[/*slot*/ ctx[18]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(174:26) {#if lobbyData.processed.eloList[slot]}",
    		ctx
    	});

    	return block;
    }

    // (170:20) {#each teamData.slots as slot}
    function create_each_block_3(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*slot*/ ctx[18] + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2;

    	function select_block_type_3(ctx, dirty) {
    		if (/*lobbyData*/ ctx[8].processed.eloList[/*slot*/ ctx[18]]) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			if_block.c();
    			t2 = space();
    			add_location(td0, file, 171, 24, 5135);
    			add_location(td1, file, 172, 24, 5175);
    			add_location(tr, file, 170, 22, 5106);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			if_block.m(td1, null);
    			append_dev(tr, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t0_value !== (t0_value = /*slot*/ ctx[18] + "")) set_data_dev(t0, t0_value);

    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(td1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(170:20) {#each teamData.slots as slot}",
    		ctx
    	});

    	return block;
    }

    // (160:14) {#each Object.entries(lobbyData.processed.teamList.playerTeams.data) as [teamName, teamData]}
    function create_each_block_2(ctx) {
    	let table;
    	let caption;
    	let t0_value = /*teamName*/ ctx[14] + "";
    	let t0;
    	let t1;
    	let thead;
    	let tr;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let tbody;
    	let t6;
    	let each_value_3 = /*teamData*/ ctx[15].slots;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			caption = element("caption");
    			t0 = text(t0_value);
    			t1 = space();
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Name";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "ELO";
    			t5 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			add_location(caption, file, 161, 18, 4802);
    			add_location(th0, file, 164, 22, 4905);
    			add_location(th1, file, 165, 22, 4941);
    			add_location(tr, file, 163, 20, 4878);
    			add_location(thead, file, 162, 18, 4850);
    			add_location(tbody, file, 168, 18, 5025);
    			add_location(table, file, 160, 16, 4776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, caption);
    			append_dev(caption, t0);
    			append_dev(table, t1);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t3);
    			append_dev(tr, th1);
    			append_dev(table, t5);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(table, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t0_value !== (t0_value = /*teamName*/ ctx[14] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*Object, lobbies*/ 4) {
    				each_value_3 = /*teamData*/ ctx[15].slots;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(160:14) {#each Object.entries(lobbyData.processed.teamList.playerTeams.data) as [teamName, teamData]}",
    		ctx
    	});

    	return block;
    }

    // (196:14) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No chat messages";
    			add_location(p, file, 196, 16, 6037);
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(196:14) {:else}",
    		ctx
    	});

    	return block;
    }

    // (190:14) {#if lobbyData.processed.chatMessages && lobbyData.processed.chatMessages.length > 0}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*lobbyData*/ ctx[8].processed.chatMessages;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
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
    			if (dirty & /*Object, lobbies*/ 4) {
    				each_value_1 = /*lobbyData*/ ctx[8].processed.chatMessages;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
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
    		source: "(190:14) {#if lobbyData.processed.chatMessages && lobbyData.processed.chatMessages.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (191:16) {#each lobbyData.processed.chatMessages as message}
    function create_each_block_1(ctx) {
    	let p;
    	let t0_value = /*message*/ ctx[11].sender + "";
    	let t0;
    	let t1;
    	let t2_value = /*message*/ ctx[11].content + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(p, "class", "striped");
    			add_location(p, file, 191, 18, 5876);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t0_value !== (t0_value = /*message*/ ctx[11].sender + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*lobbies*/ 4 && t2_value !== (t2_value = /*message*/ ctx[11].content + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(191:16) {#each lobbyData.processed.chatMessages as message}",
    		ctx
    	});

    	return block;
    }

    // (135:6) {#each Object.values(lobbies) as lobbyData}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let a;
    	let t0_value = /*lobbyData*/ ctx[8].lobbyName + "";
    	let t0;
    	let a_href_value;
    	let t1;
    	let td1;
    	let t2;
    	let td2;
    	let t3_value = /*lobbyData*/ ctx[8].playerHost + "";
    	let t3;
    	let t4;
    	let td3;
    	let details0;
    	let summary0;
    	let t5;
    	let t6;
    	let td4;
    	let details1;
    	let summary1;
    	let t8;
    	let t9;

    	function select_block_type_1(ctx, dirty) {
    		if (/*lobbyData*/ ctx[8].mapNameClean) return create_if_block_3;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*lobbyData*/ ctx[8].teamData) return create_if_block_2;
    		return create_else_block_2;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block1 = current_block_type_1(ctx);
    	let each_value_2 = Object.entries(/*lobbyData*/ ctx[8].processed.teamList.playerTeams.data);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	function select_block_type_4(ctx, dirty) {
    		if (/*lobbyData*/ ctx[8].processed.chatMessages && /*lobbyData*/ ctx[8].processed.chatMessages.length > 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_2 = select_block_type_4(ctx);
    	let if_block2 = current_block_type_2(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			if_block0.c();
    			t2 = space();
    			td2 = element("td");
    			t3 = text(t3_value);
    			t4 = space();
    			td3 = element("td");
    			details0 = element("details");
    			summary0 = element("summary");
    			if_block1.c();
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			td4 = element("td");
    			details1 = element("details");
    			summary1 = element("summary");
    			summary1.textContent = "Expand Chat";
    			t8 = space();
    			if_block2.c();
    			t9 = space();
    			attr_dev(a, "href", a_href_value = "wc3mt://join?lobbyName=" + encodeURI(/*lobbyData*/ ctx[8].lobbyName));
    			add_location(a, file, 137, 12, 3968);
    			add_location(td0, file, 136, 10, 3951);
    			add_location(td1, file, 141, 10, 4114);
    			add_location(td2, file, 148, 10, 4297);
    			add_location(summary0, file, 151, 14, 4380);
    			add_location(details0, file, 150, 13, 4356);
    			add_location(td3, file, 149, 10, 4339);
    			add_location(summary1, file, 188, 14, 5658);
    			add_location(details1, file, 187, 12, 5634);
    			add_location(td4, file, 186, 10, 5617);
    			add_location(tr, file, 135, 8, 3936);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, a);
    			append_dev(a, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			if_block0.m(td1, null);
    			append_dev(tr, t2);
    			append_dev(tr, td2);
    			append_dev(td2, t3);
    			append_dev(tr, t4);
    			append_dev(tr, td3);
    			append_dev(td3, details0);
    			append_dev(details0, summary0);
    			if_block1.m(summary0, null);
    			append_dev(details0, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(details0, null);
    			}

    			append_dev(tr, t6);
    			append_dev(tr, td4);
    			append_dev(td4, details1);
    			append_dev(details1, summary1);
    			append_dev(details1, t8);
    			if_block2.m(details1, null);
    			append_dev(tr, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lobbies*/ 4 && t0_value !== (t0_value = /*lobbyData*/ ctx[8].lobbyName + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*lobbies*/ 4 && a_href_value !== (a_href_value = "wc3mt://join?lobbyName=" + encodeURI(/*lobbyData*/ ctx[8].lobbyName))) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(td1, null);
    				}
    			}

    			if (dirty & /*lobbies*/ 4 && t3_value !== (t3_value = /*lobbyData*/ ctx[8].playerHost + "")) set_data_dev(t3, t3_value);

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(summary0, null);
    				}
    			}

    			if (dirty & /*Object, lobbies*/ 4) {
    				each_value_2 = Object.entries(/*lobbyData*/ ctx[8].processed.teamList.playerTeams.data);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(details0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_4(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(details1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block0.d();
    			if_block1.d();
    			destroy_each(each_blocks, detaching);
    			if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(135:6) {#each Object.values(lobbies) as lobbyData}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let p0;
    	let t0;
    	let p1;
    	let t1;
    	let t2;
    	let t3;
    	let p2;
    	let t4;
    	let t5;
    	let t6;
    	let table;
    	let caption;
    	let t8;
    	let thead;
    	let tr;
    	let th0;
    	let t10;
    	let th1;
    	let t12;
    	let th2;
    	let t14;
    	let th3;
    	let t16;
    	let th4;
    	let t18;
    	let tbody;

    	function select_block_type(ctx, dirty) {
    		if (/*latestDownloadURL*/ ctx[3]) return create_if_block_4;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = Object.values(/*lobbies*/ ctx[2]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			p0 = element("p");
    			if_block.c();
    			t0 = space();
    			p1 = element("p");
    			t1 = text("Websockets up: ");
    			t2 = text(/*connected*/ ctx[0]);
    			t3 = space();
    			p2 = element("p");
    			t4 = text("Current users: ");
    			t5 = text(/*clientSize*/ ctx[1]);
    			t6 = space();
    			table = element("table");
    			caption = element("caption");
    			caption.textContent = "Current Lobbies";
    			t8 = space();
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Lobby Name/Link";
    			t10 = space();
    			th1 = element("th");
    			th1.textContent = "Map Name";
    			t12 = space();
    			th2 = element("th");
    			th2.textContent = "Host";
    			t14 = space();
    			th3 = element("th");
    			th3.textContent = "Players";
    			t16 = space();
    			th4 = element("th");
    			th4.textContent = "Chat";
    			t18 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(p0, file, 108, 2, 3343);
    			add_location(p1, file, 116, 2, 3518);
    			add_location(p2, file, 119, 2, 3562);
    			add_location(caption, file, 123, 4, 3619);
    			add_location(th0, file, 126, 8, 3685);
    			add_location(th1, file, 127, 8, 3718);
    			add_location(th2, file, 128, 8, 3744);
    			set_style(th3, "width", "25%");
    			add_location(th3, file, 129, 8, 3766);
    			set_style(th4, "width", "25%");
    			add_location(th4, file, 130, 8, 3809);
    			add_location(tr, file, 125, 6, 3672);
    			add_location(thead, file, 124, 4, 3658);
    			add_location(tbody, file, 133, 4, 3870);
    			add_location(table, file, 122, 2, 3607);
    			add_location(main, file, 107, 0, 3334);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, p0);
    			if_block.m(p0, null);
    			append_dev(main, t0);
    			append_dev(main, p1);
    			append_dev(p1, t1);
    			append_dev(p1, t2);
    			append_dev(main, t3);
    			append_dev(main, p2);
    			append_dev(p2, t4);
    			append_dev(p2, t5);
    			append_dev(main, t6);
    			append_dev(main, table);
    			append_dev(table, caption);
    			append_dev(table, t8);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t10);
    			append_dev(tr, th1);
    			append_dev(tr, t12);
    			append_dev(tr, th2);
    			append_dev(tr, t14);
    			append_dev(tr, th3);
    			append_dev(tr, t16);
    			append_dev(tr, th4);
    			append_dev(table, t18);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p0, null);
    				}
    			}

    			if (dirty & /*connected*/ 1) set_data_dev(t2, /*connected*/ ctx[0]);
    			if (dirty & /*clientSize*/ 2) set_data_dev(t5, /*clientSize*/ ctx[1]);

    			if (dirty & /*Object, lobbies, encodeURI*/ 4) {
    				each_value = Object.values(/*lobbies*/ ctx[2]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    			destroy_each(each_blocks, detaching);
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

    function generateTables(lobby) {
    	try {
    		document.getElementById("tablesDiv").innerHTML = "";
    		let tbl;

    		Object.keys(lobby.processed.teamList.playerTeams.data).forEach(playerTeam => {
    			tbl = document.createElement("table");
    			tbl.classList.add("table", "table-hover", "table-striped", "table-sm");
    			let trow = tbl.createTHead().insertRow();

    			[`${playerTeam} Players`, "ELO"].forEach(label => {
    				let th = document.createElement("th");
    				th.appendChild(document.createTextNode(label));
    				trow.appendChild(th);
    			});

    			let tBody = tbl.createTBody();

    			lobby.processed.teamList.playerTeams.data[playerTeam].slots.forEach(player => {
    				let row = tBody.insertRow();
    				row.insertCell().appendChild(document.createTextNode(player));
    				let cell = row.insertCell();

    				let text = document.createTextNode(lobby.processed.eloList && lobby.processed.eloList[player]
    				? lobby.processed.eloList[player]
    				: "N/A");

    				cell.appendChild(text);
    			});

    			document.getElementById("tablesDiv").appendChild(tbl);
    		});
    	} catch(e) {
    		console.error(e.message, e.stack);
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let connected = "False";
    	let clientSize = 0;
    	let lobbies = {};
    	let socket;
    	let latestDownloadURL, latestVersion;

    	function socketSetup() {
    		socket = new WebSocket("wss://wsdev.trenchguns.com");

    		socket.addEventListener("open", function (event) {
    			$$invalidate(0, connected = "True");
    		});

    		// Listen for messages
    		socket.addEventListener("message", function (event) {
    			let message = JSON.parse(event.data);

    			switch (message.type) {
    				case "hostedLobby":
    					if (message.data.lobby.mapName.match(/(\|c[0-9abcdef]{8})/gi)) {
    						message.data.lobby.mapNameClean = message.data.lobby.mapName.replace(/(\|c[0-9abcdef]{8})|(\|r)/gi, "");
    					}
    					$$invalidate(2, lobbies[message.data.id] = message.data.lobby, lobbies);
    					break;
    				case "hostedLobbyClosed":
    					if (lobbies[message.data]) {
    						delete lobbies[message.data];
    						$$invalidate(2, lobbies);
    					}
    					break;
    				case "clientSizeChange":
    					console.log(message.data);
    					$$invalidate(1, clientSize = message.data);
    					break;
    			}
    		});

    		socket.addEventListener("close", function (event) {
    			$$invalidate(0, connected = "False");
    			$$invalidate(2, lobbies = {});
    			$$invalidate(1, clientSize = 0);
    			setTimeout(socketSetup, 1000);
    		});
    	}

    	function getLatestDownloadURL() {
    		// read text from URL location
    		var request = new XMLHttpRequest();

    		request.open("GET", "https://war.trenchguns.com/publish/latest.yml", true);
    		request.send(null);

    		request.onreadystatechange = function () {
    			if (request.readyState === 4 && request.status === 200) {
    				$$invalidate(4, latestVersion = request.responseText.split("\n")[2].split(": ")[1].trim());
    				$$invalidate(3, latestDownloadURL = latestVersion.replace(/\s/g, "%20"));
    			}
    		};
    	}

    	getLatestDownloadURL();
    	socketSetup();
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		connected,
    		clientSize,
    		lobbies,
    		socket,
    		latestDownloadURL,
    		latestVersion,
    		generateTables,
    		socketSetup,
    		getLatestDownloadURL
    	});

    	$$self.$inject_state = $$props => {
    		if ('connected' in $$props) $$invalidate(0, connected = $$props.connected);
    		if ('clientSize' in $$props) $$invalidate(1, clientSize = $$props.clientSize);
    		if ('lobbies' in $$props) $$invalidate(2, lobbies = $$props.lobbies);
    		if ('socket' in $$props) socket = $$props.socket;
    		if ('latestDownloadURL' in $$props) $$invalidate(3, latestDownloadURL = $$props.latestDownloadURL);
    		if ('latestVersion' in $$props) $$invalidate(4, latestVersion = $$props.latestVersion);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [connected, clientSize, lobbies, latestDownloadURL, latestVersion];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
