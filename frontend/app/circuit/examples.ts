import type { Component, ExampleCircuit } from "./types";

// Circuits prets a charger dans l'editeur.
export const EXAMPLE_CIRCUITS: ExampleCircuit[] = [
  // Resistances en serie.
  {
    label: "Résistances en série — division de tension",
    circuit: {
      components: [
        { id:"rs_v",   type:"vsource",  position:{ x:192, y:144 }, rotation:0, props:{ voltage:5 } },
        { id:"rs_r1",  type:"resistor", position:{ x:336, y:96  }, rotation:0, props:{ resistance:1000 } },
        { id:"rs_r2",  type:"resistor", position:{ x:480, y:96  }, rotation:0, props:{ resistance:2000 } },
        { id:"rs_gnd", type:"ground",   position:{ x:360, y:312 }, rotation:0, props:{} },
      ] as Component[],
      wires: [
        { id:"rs_w1", points:[{ x:192, y:96  }, { x:288, y:96  }] },
        { id:"rs_w2", points:[{ x:384, y:96  }, { x:432, y:96  }] },
        { id:"rs_w3", points:[{ x:528, y:96  }, { x:528, y:288 }, { x:360, y:288 }] },
        { id:"rs_w4", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:360, y:288 }] },
      ],
    },
  },
  // Resistances en parallele.
  {
    label: "Résistances en parallèle — division de courant",
    circuit: {
      components: [
        { id:"rp_v",   type:"vsource",  position:{ x:192, y:192 }, rotation:0,  props:{ voltage:5 } },
        { id:"rp_r1",  type:"resistor", position:{ x:384, y:192 }, rotation:90, props:{ resistance:1000 } },
        { id:"rp_r2",  type:"resistor", position:{ x:528, y:192 }, rotation:90, props:{ resistance:2000 } },
        { id:"rp_gnd", type:"ground",   position:{ x:360, y:264 }, rotation:0,  props:{} },
      ] as Component[],
      wires: [
        { id:"rp_w1", points:[{ x:192, y:144 }, { x:384, y:144 }, { x:528, y:144 }] },
        { id:"rp_w2", points:[{ x:192, y:240 }, { x:360, y:240 }, { x:384, y:240 }, { x:528, y:240 }] },
      ],
    },
  },
  // Circuit RC avec une charge rapide.
  {
    label: "Circuit RC — charge rapide (τ = 10 ms)",
    circuit: {
      components: [
        { id:"rcf_v",   type:"vsource",   position:{ x:192, y:144 }, rotation:0,  props:{ voltage:5 } },
        { id:"rcf_sw",  type:"switch",    position:{ x:288, y:96  }, rotation:0,  props:{ closed:true } },
        { id:"rcf_r",   type:"resistor",  position:{ x:432, y:96  }, rotation:0,  props:{ resistance:1000 } },
        { id:"rcf_c",   type:"capacitor", position:{ x:576, y:192 }, rotation:90, props:{ capacitance:10e-6 } },
        { id:"rcf_gnd", type:"ground",    position:{ x:408, y:312 }, rotation:0,  props:{} },
      ] as Component[],
      wires: [
        { id:"rcf_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        { id:"rcf_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        { id:"rcf_w3", points:[{ x:480, y:96  }, { x:576, y:96  }, { x:576, y:144 }] },
        { id:"rcf_w4", points:[{ x:576, y:240 }, { x:576, y:288 }, { x:408, y:288 }] },
        { id:"rcf_w5", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:408, y:288 }] },
      ],
    },
  },
  // Circuit RL avec montee du courant.
  {
    label: "Circuit RL — montée du courant (τ = 0.1 ms)",
    circuit: {
      components: [
        { id:"rl_v",   type:"vsource",  position:{ x:192, y:144 }, rotation:0, props:{ voltage:5 } },
        { id:"rl_sw",  type:"switch",   position:{ x:288, y:96  }, rotation:0, props:{ closed:true } },
        { id:"rl_r",   type:"resistor", position:{ x:432, y:96  }, rotation:0, props:{ resistance:100 } },
        { id:"rl_l",   type:"inductor", position:{ x:576, y:96  }, rotation:0, props:{ inductance:10e-3 } },
        { id:"rl_gnd", type:"ground",   position:{ x:408, y:288 }, rotation:0, props:{} },
      ] as Component[],
      wires: [
        { id:"rl_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        { id:"rl_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        { id:"rl_w3", points:[{ x:480, y:96  }, { x:528, y:96  }] },
        { id:"rl_w4", points:[{ x:624, y:96  }, { x:624, y:264 }, { x:408, y:264 }] },
        { id:"rl_w5", points:[{ x:192, y:192 }, { x:192, y:264 }, { x:408, y:264 }] },
      ],
    },
  },
  // Circuit RC avec interrupteur.
  {
    label: "Circuit RC avec switch — charge lente (τ = 1 s)",
    circuit: {
      components: [
        { id:"rcs_v",   type:"vsource",   position:{ x:192, y:144 }, rotation:0,  props:{ voltage:5 } },
        { id:"rcs_sw",  type:"switch",    position:{ x:288, y:96  }, rotation:0,  props:{ closed:false } },
        { id:"rcs_r",   type:"resistor",  position:{ x:432, y:96  }, rotation:0,  props:{ resistance:10000 } },
        { id:"rcs_c",   type:"capacitor", position:{ x:576, y:192 }, rotation:90, props:{ capacitance:100e-6 } },
        { id:"rcs_gnd", type:"ground",    position:{ x:408, y:312 }, rotation:0,  props:{} },
      ] as Component[],
      wires: [
        { id:"rcs_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        { id:"rcs_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        { id:"rcs_w3", points:[{ x:480, y:96  }, { x:576, y:96  }, { x:576, y:144 }] },
        { id:"rcs_w4", points:[{ x:576, y:240 }, { x:576, y:288 }, { x:408, y:288 }] },
        { id:"rcs_w5", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:408, y:288 }] },
      ],
    },
  },
  // Deux branches controlees par interrupteurs.
  {
    label: "Circuit multi-switch — branches contrôlées",
    circuit: {
      components: [
        { id:"ms_v",   type:"vsource",  position:{ x:96,  y:192 }, rotation:0, props:{ voltage:5 } },
        { id:"ms_sw1", type:"switch",   position:{ x:288, y:144 }, rotation:0, props:{ closed:true } },
        { id:"ms_r1",  type:"resistor", position:{ x:432, y:144 }, rotation:0, props:{ resistance:1000 } },
        { id:"ms_sw2", type:"switch",   position:{ x:288, y:240 }, rotation:0, props:{ closed:false } },
        { id:"ms_r2",  type:"resistor", position:{ x:432, y:240 }, rotation:0, props:{ resistance:2200 } },
        { id:"ms_gnd", type:"ground",   position:{ x:288, y:384 }, rotation:0, props:{} },
      ] as Component[],
      wires: [
        { id:"ms_w1", points:[{ x:96,  y:144 }, { x:192, y:144 }, { x:240, y:144 }] },
        { id:"ms_w2", points:[{ x:192, y:144 }, { x:192, y:240 }, { x:240, y:240 }] },
        { id:"ms_w3", points:[{ x:336, y:144 }, { x:384, y:144 }] },
        { id:"ms_w4", points:[{ x:336, y:240 }, { x:384, y:240 }] },
        { id:"ms_w5", points:[{ x:480, y:144 }, { x:480, y:240 }, { x:480, y:360 }, { x:288, y:360 }] },
        { id:"ms_w6", points:[{ x:96,  y:240 }, { x:96,  y:360 }, { x:288, y:360 }] },
      ],
    },
  },
  // Circuit RLC pour voir les oscillations.
  {
    label: "Circuit RLC — oscillations amorties",
    circuit: {
      components: [
        { id:"rlc_v",   type:"vsource",   position:{ x:192, y:144 }, rotation:0,  props:{ voltage:10 } },
        { id:"rlc_sw",  type:"switch",    position:{ x:288, y:96  }, rotation:0,  props:{ closed:true } },
        { id:"rlc_r",   type:"resistor",  position:{ x:432, y:96  }, rotation:0,  props:{ resistance:10 } },
        { id:"rlc_l",   type:"inductor",  position:{ x:576, y:96  }, rotation:0,  props:{ inductance:10e-3 } },
        { id:"rlc_c",   type:"capacitor", position:{ x:672, y:192 }, rotation:90, props:{ capacitance:100e-6 } },
        { id:"rlc_gnd", type:"ground",    position:{ x:432, y:312 }, rotation:0,  props:{} },
      ] as Component[],
      wires: [
        { id:"rlc_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        { id:"rlc_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        { id:"rlc_w3", points:[{ x:480, y:96  }, { x:528, y:96  }] },
        { id:"rlc_w4", points:[{ x:624, y:96  }, { x:672, y:96  }, { x:672, y:144 }] },
        { id:"rlc_w5", points:[{ x:672, y:240 }, { x:672, y:288 }, { x:432, y:288 }] },
        { id:"rlc_w6", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:432, y:288 }] },
      ],
    },
  },
  // LED avec interrupteur.
  {
    label: "LED + Interrupteur",
    circuit: {
      components: [
        { id:"ex_v",   type:"vsource",  position:{ x:192, y:144 }, rotation:0, props:{ voltage:5 } },
        { id:"ex_sw",  type:"switch",   position:{ x:288, y:96  }, rotation:0, props:{ closed:false } },
        { id:"ex_r",   type:"resistor", position:{ x:432, y:96  }, rotation:0, props:{ resistance:220 } },
        { id:"ex_led", type:"led",      position:{ x:576, y:96  }, rotation:0, props:{ color:"rouge", forwardVoltage:2.0 } },
        { id:"ex_gnd", type:"ground",   position:{ x:408, y:312 }, rotation:0, props:{} },
      ] as Component[],
      wires: [
        { id:"ex_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        { id:"ex_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        { id:"ex_w3", points:[{ x:480, y:96  }, { x:528, y:96  }] },
        { id:"ex_w4", points:[{ x:624, y:96  }, { x:624, y:288 }, { x:408, y:288 }] },
        { id:"ex_w5", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:408, y:288 }] },
      ],
    },
  },
  // Porte AND avec deux NPN en serie.
  {
    label: "Porte AND — 2 NPN en série (SW_A ET SW_B)",
    circuit: {
      components: [
        { id:"and_v",   type:"vsource",   position:{ x:96,  y:240 }, rotation:0,  props:{ voltage:5 } },
        { id:"and_swa", type:"switch",    position:{ x:240, y:144 }, rotation:0,  props:{ closed:false } },
        { id:"and_swb", type:"switch",    position:{ x:240, y:336 }, rotation:0,  props:{ closed:false } },
        { id:"and_rb1", type:"resistor",  position:{ x:384, y:144 }, rotation:0,  props:{ resistance:10000 } },
        { id:"and_rb2", type:"resistor",  position:{ x:384, y:336 }, rotation:0,  props:{ resistance:10000 } },
        { id:"and_q1",  type:"npn_ideal", position:{ x:528, y:192 }, rotation:0,  props:{ vbe_on:0.7, ron:10 } },
        { id:"and_q2",  type:"npn_ideal", position:{ x:528, y:288 }, rotation:0,  props:{ vbe_on:0.7, ron:10 } },
        { id:"and_led", type:"led",       position:{ x:552, y:96  }, rotation:90, props:{ color:"rouge", forwardVoltage:2.0 } },
        { id:"and_gnd", type:"ground",    position:{ x:552, y:360 }, rotation:0,  props:{} },
      ] as Component[],
      wires: [
        { id:"and_w1", points:[{ x:96, y:192 }, { x:96, y:48 }, { x:552, y:48 }] },
        { id:"and_w2", points:[{ x:96, y:192 }, { x:192, y:192 }, { x:192, y:144 }] },
        { id:"and_w3", points:[{ x:96, y:192 }, { x:48, y:192 }, { x:48, y:336 }, { x:192, y:336 }] },
        { id:"and_w4", points:[{ x:288, y:144 }, { x:336, y:144 }] },
        { id:"and_w5", points:[{ x:288, y:336 }, { x:336, y:336 }] },
        { id:"and_w6", points:[{ x:432, y:144 }, { x:504, y:144 }, { x:504, y:192 }] },
        { id:"and_w7", points:[{ x:432, y:336 }, { x:504, y:336 }, { x:504, y:288 }] },
        { id:"and_w8", points:[{ x:96, y:288 }, { x:96, y:408 }, { x:552, y:408 }, { x:552, y:336 }] },
      ],
    },
  },
  // Porte OR avec deux NPN en parallele.
  {
    label: "Porte OR — 2 NPN en parallèle (SW_A OU SW_B)",
    circuit: {
      components: [
        { id:"0gbi3kw", type:"vsource",   position:{ x:-72, y:24  }, rotation:0,   props:{ voltage:5 } },
        { id:"i3gngen", type:"switch",    position:{ x:48,  y:-24 }, rotation:90,  props:{ closed:false } },
        { id:"a36a0qu", type:"switch",    position:{ x:240, y:-24 }, rotation:90,  props:{ closed:false } },
        { id:"l8g4unp", type:"npn_ideal", position:{ x:48,  y:72  }, rotation:90,  props:{ vbe_on:0.7, ron:10 } },
        { id:"2q5x9gw", type:"resistor",  position:{ x:144, y:-24 }, rotation:90,  props:{ resistance:1000 } },
        { id:"9fvy9d6", type:"npn_ideal", position:{ x:216, y:72  }, rotation:90,  props:{ vbe_on:0.7, ron:10 } },
        { id:"3lvsz7y", type:"led",       position:{ x:72,  y:192 }, rotation:180, props:{ color:"rouge", forwardVoltage:2 } },
        { id:"og3ntnf", type:"ground",    position:{ x:-72, y:216 }, rotation:0,   props:{} },
      ] as Component[],
      wires: [
        { id:"3g5o9ad", points:[{ x:-72, y:-24 }, { x:-72, y:-72 }, { x:48,  y:-72 }, { x:48,  y:-72 }] },
        { id:"oua8yzr", points:[{ x:48,  y:-72 }, { x:144, y:-72 }, { x:144, y:-72 }] },
        { id:"5i3yaon", points:[{ x:144, y:-72 }, { x:240, y:-72 }, { x:240, y:-72 }] },
        { id:"5m2rkw7", points:[{ x:48,  y:24  }, { x:48,  y:48  }, { x:48,  y:48  }] },
        { id:"fhjfjpc", points:[{ x:144, y:24  }, { x:96,  y:24  }, { x:96,  y:96  }, { x:96,  y:96  }] },
        { id:"nlkxci6", points:[{ x:240, y:24  }, { x:216, y:24  }, { x:216, y:48  }, { x:216, y:48  }] },
        { id:"5w262zm", points:[{ x:144, y:24  }, { x:288, y:24  }, { x:312, y:24  }, { x:312, y:96  }, { x:264, y:96  }, { x:264, y:96  }] },
        { id:"96mzzka", points:[{ x:0,   y:96  }, { x:0,   y:144 }, { x:120, y:144 }, { x:120, y:192 }, { x:120, y:192 }] },
        { id:"2f6fve2", points:[{ x:168, y:96  }, { x:168, y:192 }, { x:120, y:192 }, { x:120, y:192 }] },
        { id:"k2dzss4", points:[{ x:24,  y:192 }, { x:-72, y:192 }, { x:-72, y:192 }, { x:-72, y:192 }] },
        { id:"s73xhek", points:[{ x:-72, y:192 }, { x:-72, y:72  }, { x:-72, y:72  }] },
      ],
    },
  },
];
