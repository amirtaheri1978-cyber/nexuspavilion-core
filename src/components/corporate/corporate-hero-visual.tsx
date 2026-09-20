"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import styles from "./corporate-home.module.css";

type Ribbon = { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; speed: number; phase: number };
type Packet = { sprite: THREE.Sprite; curve: THREE.CatmullRomCurve3; speed: number; offset: number; base: number; phase: number };
type Orbit = { tube: THREE.Mesh; tracer: THREE.Sprite; curve: THREE.CatmullRomCurve3; speed: number; index: number };
type StreamPacket = { packet: THREE.Mesh; curve: THREE.CatmullRomCurve3; speed: number; offset: number };

export default function CorporateHeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      canvas.hidden = true;
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x01040a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x01040a, 0.019);
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 140);
    camera.position.set(0, 0.2, 12.7);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.84, 0.72, 0.12);
    bloom.threshold = 0.11; bloom.strength = 0.34; bloom.radius = 0.48;
    composer.addPass(bloom);

    const world = new THREE.Group();
    world.position.set(3.82, 0.1, 0);
    scene.add(world);
    const globe = new THREE.Group();
    world.add(globe);

    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x081524, roughness: 0.1, metalness: 0.1, transmission: 0.62, thickness: 2.1, ior: 1.46, transparent: true, opacity: 0.5, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x06172d, emissiveIntensity: 0.18 });
    const glassCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.72, 5), glassMaterial);
    glassCore.scale.set(1, 1.12, 0.88); glassCore.rotation.set(0.28, -0.48, 0.18); globe.add(glassCore);
    const veilCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.95, 5), new THREE.MeshPhysicalMaterial({ color: 0x6edfff, roughness: 0.18, metalness: 0.02, transmission: 0.88, thickness: 1.1, ior: 1.22, transparent: true, opacity: 0.055, clearcoat: 0.72, clearcoatRoughness: 0.1, depthWrite: false }));
    veilCore.scale.set(1.12, 1, 1.05); veilCore.rotation.set(0.18, 0.18, -0.1); globe.add(veilCore);

    const goldCoreMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } }, vertexShader: "varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}", fragmentShader: "precision highp float;varying vec3 vPos;uniform float uTime;void main(){float r=length(vPos);float pulse=.5+.5*sin(uTime*.76+r*9.0);float weave=.5+.5*sin(vPos.x*12.0+vPos.y*8.0-vPos.z*7.0+uTime*.52);float shell=pow(max(0.0,1.0-r),1.6);vec3 col=mix(vec3(.42,.16,.02),vec3(1.0,.71,.26),.52+.48*weave);gl_FragColor=vec4(col,shell*(.10+.12*pulse));}" });
    const goldCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.98, 5), goldCoreMaterial);
    goldCore.scale.set(0.82, 1.18, 0.74); goldCore.rotation.set(-0.25, 0.32, -0.16); globe.add(goldCore);
    const fieldMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } }, vertexShader: "uniform float uTime;varying float vN;varying vec3 vPos;void main(){vec3 p=position;vec3 n=normalize(position);float d=sin(p.y*4.0+uTime*.34)*.08+sin(p.x*3.2-uTime*.27)*.06+sin(p.z*5.0+uTime*.22)*.04;p+=n*d;vN=.5+.5*sin(uTime*.4+p.x*2.0-p.y*1.6);vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}", fragmentShader: "precision highp float;varying float vN;varying vec3 vPos;void main(){vec3 col=mix(vec3(.42,.35,1.0),vec3(.28,.82,1.0),.58+.30*vN);float g=pow(max(0.0,sin(vPos.y*5.0+vPos.z*3.0)),7.0);col=mix(col,vec3(1.0,.67,.20),.10*g);gl_FragColor=vec4(col,.018+.026*vN);}" });
    const fieldMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 5), fieldMaterial);
    fieldMesh.scale.set(1.18, 0.94, 1.12); fieldMesh.rotation.set(0.16, 0.06, -0.14); globe.add(fieldMesh);

    const ribbonGroup = new THREE.Group(); globe.add(ribbonGroup);
    const ribbons: Ribbon[] = [];
    const ribbonCurve = (seed: number, radius: number, height: number, twist: number) => {
      const points: THREE.Vector3[] = [];
      for (let index = 0; index < 120; index += 1) { const t = index / 119; const angle = t * Math.PI * 2 + seed; const r = radius * (0.78 + 0.22 * Math.sin(angle * 3 + seed)); points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle * 2 + seed) * height, Math.sin(angle + twist) * r * 0.78)); }
      return new THREE.CatmullRomCurve3(points, true, "centripetal");
    };
    const ribbonConfig: Array<[number, number, number, number, number, number, number]> = [[0.15,2.52,.78,.10,0x76e6ff,.24,.023],[1.20,2.74,.56,1,0x5f8dff,.16,.017],[2.35,2.40,.90,2.20,0xe2bd68,.13,.015],[3.50,2.86,.42,3.10,0x76dcff,.10,.012],[4.70,2.64,.68,4.10,0x8b72ff,.08,.010]];
    ribbonConfig.forEach((config, index) => { const curve = ribbonCurve(config[0], config[1], config[2], config[3]); const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 520, config[6], 10, true), new THREE.MeshPhysicalMaterial({ color: config[4], emissive: config[4], emissiveIntensity: 0.16, roughness: 0.14, metalness: 0.1, transparent: true, opacity: config[5], transmission: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); mesh.rotation.set(index * 0.14, -index * 0.18, index * 0.09); ribbonGroup.add(mesh); ribbons.push({ mesh, curve, speed: 0.004 + index * 0.0014, phase: index * 0.8 }); });

    const torusLayers: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    ([[2.5,.018,0x6ee7ff,.10,.005],[2.76,.012,0x527fff,.06,-.003],[3.04,.009,0xe0bd69,.045,.0025]] as Array<[number,number,number,number,number]>).forEach((config,index)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(config[0],config[1],8,320),new THREE.MeshBasicMaterial({color:config[2],transparent:true,opacity:config[3],blending:THREE.AdditiveBlending,depthWrite:false}));mesh.rotation.set(.55+index*.34,-.35+index*.27,.25-index*.18);globe.add(mesh);torusLayers.push({mesh,speed:config[4]});});
    const haloMaterial = new THREE.ShaderMaterial({ transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,wireframe:true,uniforms:{uTime:{value:0}},vertexShader:"uniform float uTime;varying float vPulse;void main(){vec3 p=position;vec3 n=normalize(position);float d=sin(p.y*2.4+uTime*.30)*.09+sin(p.x*3.6-uTime*.24)*.06+sin(p.z*4.2+uTime*.19)*.045;p+=n*d;vPulse=.5+.5*sin(uTime*.38+p.y*1.7);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}",fragmentShader:"precision highp float;varying float vPulse;void main(){gl_FragColor=vec4(.50,.84,1.0,.009+.011*vPulse);}" });
    const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(3.28,4),haloMaterial); halo.scale.set(1.08,.94,1.02); globe.add(halo);

    const positions = new Float32Array(3800 * 3); const colors = new Float32Array(3800 * 3); const color = new THREE.Color();
    for(let index=0;index<3800;index+=1){const a=Math.random()*Math.PI*2;const b=Math.acos(2*Math.random()-1);const r=Math.pow(Math.random(),.62)*2.35;positions[index*3]=Math.sin(b)*Math.cos(a)*r;positions[index*3+1]=Math.cos(b)*r*.88;positions[index*3+2]=Math.sin(b)*Math.sin(a)*r;const random=Math.random();color.set(random<.07?0xe6c26b:(random<.34?0xa8efff:(random<.66?0x5a93ff:0x7d6fff)));colors[index*3]=color.r;colors[index*3+1]=color.g;colors[index*3+2]=color.b;}
    const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute("position",new THREE.BufferAttribute(positions,3));particleGeometry.setAttribute("color",new THREE.BufferAttribute(colors,3));const particleCloud=new THREE.Points(particleGeometry,new THREE.PointsMaterial({size:.018,vertexColors:true,transparent:true,opacity:.36,depthWrite:false,blending:THREE.AdditiveBlending}));globe.add(particleCloud);
    const lattice: THREE.Mesh[]=[]; for(let index=0;index<7;index+=1){const points:THREE.Vector3[]=[];const radius=2.10+index*.09;for(let j=0;j<160;j+=1){const t=j/159*Math.PI*2;points.push(new THREE.Vector3(Math.cos(t+index*.25)*radius,Math.sin(t*1.75+index*.55)*radius*.36,Math.sin(t+index*.9)*radius*.74));}const curve=new THREE.CatmullRomCurve3(points,true,"centripetal");const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,260,.0032,5,true),new THREE.MeshBasicMaterial({color:index%3===0?0xe1bd69:(index%2===0?0x7adfff:0x6b90ff),transparent:true,opacity:index%3===0?.028:.018,blending:THREE.AdditiveBlending,depthWrite:false}));tube.rotation.set(index*.18,-index*.11,index*.07);globe.add(tube);lattice.push(tube);}

    const glowCanvas=document.createElement("canvas");glowCanvas.width=64;glowCanvas.height=64;const context=glowCanvas.getContext("2d");if(!context){canvas.hidden=true;renderer.dispose();return;}const gradient=context.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,"rgba(255,255,255,1)");gradient.addColorStop(.14,"rgba(180,244,255,.98)");gradient.addColorStop(.42,"rgba(75,178,255,.35)");gradient.addColorStop(1,"rgba(75,178,255,0)");context.fillStyle=gradient;context.fillRect(0,0,64,64);const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
    const packets:Packet[]=[];ribbons.forEach((ribbon,index)=>{const count=index===0?3:2;for(let k=0;k<count;k+=1){const warm=index===2&&k===0;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:warm?0xffdb82:0xd7fbff,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false}));const base=warm?.16:.115;sprite.scale.setScalar(base);ribbonGroup.add(sprite);packets.push({sprite,curve:ribbon.curve,speed:.030+index*.004+k*.002,offset:(index*.17+k*.31)%1,base,phase:index*.7+k});}});
    const majorNodes:THREE.Sprite[]=[];([[1.42,1.02,.82,.17,1],[-1.62,.54,1.06,.13,0],[1.10,-1.34,-.68,.12,0],[-.58,1.48,-1.18,.11,1],[.20,-.58,1.84,.10,0]] as number[][]).forEach((node,index)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:node[4]?0xffd979:0xd9fbff,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.position.set(node[0],node[1],node[2]);sprite.scale.setScalar(node[3]);sprite.userData={base:node[3],phase:index*.83};globe.add(sprite);majorNodes.push(sprite);});

    const orbitData:Orbit[]=[];
    const orbitConfig:Array<[number,number,number,number,number,number]>=[[.2,3.48,.22,0x7ae6ff,.12,.12],[1.5,3.90,.30,0xe0bd69,.08,.09],[2.8,4.24,.38,0x6d9fff,.06,.07],[4,4.60,.25,0x76dcff,.045,.052]];
    orbitConfig.forEach((config,index)=>{const points:THREE.Vector3[]=[];for(let step=0;step<220;step+=1){const angle=step/219*Math.PI*2+config[0];points.push(new THREE.Vector3(Math.cos(angle)*config[1],Math.sin(angle)*config[1]*config[2],Math.sin(angle*1.4+config[0])*.42));}const curve=new THREE.CatmullRomCurve3(points,true,"centripetal");const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,420,.006+(index===0?.003:0),5,true),new THREE.MeshBasicMaterial({color:config[3],transparent:true,opacity:config[4],blending:THREE.AdditiveBlending,depthWrite:false}));tube.rotation.set(-.38+index*.20,-.16+index*.11,-.18+index*.13);world.add(tube);const tracer=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:index%2?0xffdc81:0xd7fbff,transparent:true,opacity:.94,blending:THREE.AdditiveBlending,depthWrite:false}));tracer.scale.setScalar(index%2?.15:.115);tube.add(tracer);orbitData.push({tube,tracer,curve,speed:config[5],index});});

    const streamPackets:StreamPacket[]=[];
    for(let stream=0;stream<12;stream+=1){const y=(stream-6)*.12;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.5,y*.42,-1.25),new THREE.Vector3(-.6,y+Math.sin(stream*.47)*.34,-.78),new THREE.Vector3(2.1,y*.18+Math.sin(stream*.79)*.43,-.25),new THREE.Vector3(5.2,y*.12+Math.cos(stream*.61)*.34,.34),new THREE.Vector3(8.8,y*.18+Math.sin(stream*.34)*.30,.88)],false,"centripetal");const warm=stream%10===0;const strong=stream%7===0;const violet=stream%13===0;scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,420,strong?.007:.0032,5,false),new THREE.MeshBasicMaterial({color:warm?0xd9b962:(violet?0x7d6fff:(strong?0x74e8ff:0x3d7fff)),transparent:true,opacity:warm?.10:(violet?.035:(strong?.13:.022)),blending:THREE.AdditiveBlending,depthWrite:false})));if(stream%3===0){const packet=new THREE.Mesh(new THREE.SphereGeometry(warm?.045:.031,14,14),new THREE.MeshBasicMaterial({color:warm?0xffde89:(violet?0xb4aaff:0xd6fbff),transparent:true,opacity:.98,blending:THREE.AdditiveBlending}));scene.add(packet);streamPackets.push({packet,curve,speed:.046+(stream%6)*.0055,offset:stream/12});}}

    const starsPositions=new Float32Array(3000*3);const starsColors=new Float32Array(3000*3);for(let index=0;index<3000;index+=1){starsPositions[index*3]=(Math.random()-.5)*36;starsPositions[index*3+1]=(Math.random()-.5)*22;starsPositions[index*3+2]=-4-Math.random()*22;const random=Math.random();color.set(random<.04?0xe0c173:(random<.11?0x8b7eff:0x4a96ff));starsColors[index*3]=color.r;starsColors[index*3+1]=color.g;starsColors[index*3+2]=color.b;}const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute("position",new THREE.BufferAttribute(starsPositions,3));starsGeometry.setAttribute("color",new THREE.BufferAttribute(starsColors,3));const stars=new THREE.Points(starsGeometry,new THREE.PointsMaterial({size:.021,vertexColors:true,transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(stars);
    const backgroundDots:Array<{dot:THREE.Sprite;base:number;origin:THREE.Vector3;phase:number;drift:number;twinkle:number}>=[];for(let index=0;index<42;index+=1){const warm=index%9===0;const dot=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:warm?0xffd98c:(index%4===0?0x8fd8ff:0xd8fbff),transparent:true,opacity:warm?.68:.54,blending:THREE.AdditiveBlending,depthWrite:false}));const side=index%2===0?-1:1;dot.position.set(side<0?-8.8-Math.random()*7.5:9.2+Math.random()*7.8,(Math.random()-.5)*8.8,-2.5-Math.random()*8.5);const size=(warm?.12:.075)+Math.random()*.07;dot.scale.setScalar(size);scene.add(dot);backgroundDots.push({dot,base:size,origin:dot.position.clone(),phase:Math.random()*Math.PI*2,drift:.08+Math.random()*.20,twinkle:.5+Math.random()*1.2});}
    const cyanKey=new THREE.PointLight(0x84ecff,15,26,2);cyanKey.position.set(5.9,2.5,4.2);scene.add(cyanKey);const goldKey=new THREE.PointLight(0xe4bd67,9,18,2);goldKey.position.set(2.4,-2.1,3.8);scene.add(goldKey);const violetFill=new THREE.PointLight(0x776dff,2.6,24,2);violetFill.position.set(7.2,.7,-3.2);scene.add(violetFill);const blueFill=new THREE.PointLight(0x2e69ff,11,20,2);blueFill.position.set(8.2,-.8,-4);scene.add(blueFill);

    const pointer={x:0,y:0,targetX:0,targetY:0}; const onPointer=(event:PointerEvent)=>{pointer.targetX=event.clientX/window.innerWidth-.5;pointer.targetY=event.clientY/window.innerHeight-.5;};
    const responsive=()=>{if(window.innerWidth<980){world.position.set(2.9,-.15,-1.25);world.scale.setScalar(.8);camera.position.z=13.7;}else{world.position.set(3.82,.1,0);world.scale.setScalar(1);camera.position.z=12.7;}};
    const onResize=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);composer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));responsive();composer.render();};responsive();if(!reduced)window.addEventListener("pointermove",onPointer);window.addEventListener("resize",onResize);
    const clock=new THREE.Clock();let animationFrame=0;const streamPosition=new THREE.Vector3();const animate=()=>{animationFrame=window.requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),.033);const elapsed=clock.elapsedTime;pointer.x+=(pointer.targetX-pointer.x)*.03;pointer.y+=(pointer.targetY-pointer.y)*.03;if(!reduced){globe.rotation.y+=delta*.092;globe.rotation.x=Math.sin(elapsed*.14)*.026;goldCoreMaterial.uniforms.uTime.value=elapsed;fieldMaterial.uniforms.uTime.value=elapsed;haloMaterial.uniforms.uTime.value=elapsed;glassCore.rotation.y+=delta*.018;goldCore.rotation.y-=delta*.034;fieldMesh.rotation.y+=delta*.012;veilCore.rotation.y-=delta*.010;particleCloud.rotation.y+=delta*.009;lattice.forEach((tube,index)=>{tube.rotation.y+=delta*(.0035+index*.00055);});ribbons.forEach((ribbon)=>{ribbon.mesh.rotation.y+=delta*ribbon.speed;ribbon.mesh.rotation.x+=delta*ribbon.speed*.42;ribbon.mesh.rotation.z=Math.sin(elapsed*.11+ribbon.phase)*.045;});torusLayers.forEach((layer)=>{layer.mesh.rotation.z+=delta*layer.speed;layer.mesh.rotation.y+=delta*layer.speed*.38;});packets.forEach((packet)=>{packet.curve.getPointAt((elapsed*packet.speed+packet.offset)%1,packet.sprite.position);packet.sprite.scale.setScalar(packet.base*(1+.15*Math.sin(elapsed*1.7+packet.phase)));});majorNodes.forEach((node)=>{node.scale.setScalar(node.userData.base*(1+.15*Math.sin(elapsed+node.userData.phase)));});orbitData.forEach((orbit)=>{orbit.tube.rotation.y+=delta*(.012+orbit.index*.0017);orbit.curve.getPointAt((elapsed*orbit.speed+orbit.index*.153)%1,orbit.tracer.position);});streamPackets.forEach((item,index)=>{item.curve.getPointAt((elapsed*item.speed+item.offset)%1,streamPosition);item.packet.position.copy(streamPosition);item.packet.scale.setScalar(.86+.24*Math.sin(elapsed*3.1+index));});stars.rotation.y+=delta*.0022;backgroundDots.forEach((item,index)=>{const twinkle=.56+.44*Math.sin(elapsed*item.twinkle+item.phase);item.dot.position.y=item.origin.y+Math.cos(elapsed*(.12+item.drift*.22)+item.phase)*.22;(item.dot.material as THREE.SpriteMaterial).opacity=(.18+twinkle*.46)*(index%9===0?1:.82);item.dot.scale.setScalar(item.base*(.90+twinkle*.30));});cyanKey.intensity=17+Math.sin(elapsed*.45)*1.8;goldKey.intensity=7.2+Math.sin(elapsed*.39+1.2);violetFill.intensity=2.8+Math.sin(elapsed*.27+2)*.55;}world.rotation.y=pointer.x*.05;world.rotation.x=-pointer.y*.03;camera.position.x=pointer.x*.12;camera.position.y=.2-pointer.y*.10;camera.lookAt(1.9,0,0);composer.render();};
    animate();

    return()=>{window.cancelAnimationFrame(animationFrame);window.removeEventListener("pointermove",onPointer);window.removeEventListener("resize",onResize);scene.traverse((object)=>{const mesh=object as THREE.Mesh;mesh.geometry?.dispose();const material=mesh.material;if(Array.isArray(material))material.forEach((item)=>item.dispose());else material?.dispose();});glowTexture.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss();};
  }, []);

  return <div className={styles.visual} aria-hidden="true"><div className={styles.fallback} /><canvas ref={canvasRef} className={styles.canvas} /><div className={styles.loading}>Composing Nexus spatial intelligence</div></div>;
}
