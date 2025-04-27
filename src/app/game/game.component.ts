import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three-stdlib';
import { Tween, Group, Easing } from '@tweenjs/tween.js';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private loader = new GLTFLoader();

  private animationGroup = new Group();
  private selectedPiece: THREE.Object3D | null = null;
  private hoveredPiece: THREE.Object3D | null = null;
  private adjacentPositions: Record<string, THREE.Mesh> = {};
  private handArea = { startX: -3, y: 15, z: 13.3, spacing: 1 };

  constructor(private wsService: WebsocketService) {}

  ngOnInit(): void {}
  ngAfterViewInit(): void {
    this.initThreeJS();
    this.loadDominoPieces();
    this.renderer.setAnimationLoop(() => this.animate());
  }
  ngOnDestroy(): void { this.renderer.dispose(); }

  private initThreeJS(): void {
    // setup camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 23, 15);
    this.camera.lookAt(0, 0, 0);

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x5B3A29); // wood brown background
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10,20,10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // board
    const size = 20;
    new THREE.TextureLoader().load(
      'assets/textures/wood_table.jpg',
      tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4,4);
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size),
          new THREE.MeshPhongMaterial({ map: tex })
        );
        board.rotation.x = -Math.PI/2;
        board.receiveShadow = true;
        this.scene.add(board);
      }, undefined, () => {
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size),
          new THREE.MeshPhongMaterial({ color: 0xDEB887 })
        );
        board.rotation.x = -Math.PI/2;
        board.receiveShadow = true;
        this.scene.add(board);
      }
    );

    // table borders
    const borderMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const t = 0.5, h=1;
    [[size+2*t,t,t,0,-size/2-t/2],[size+2*t,t,t,0,size/2+t/2],[t,t,size,-size/2-t/2,0],[t,t,size,size/2+t/2,0]]
      .forEach(params => {
        const [w,th,d,x,z] = params;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,th,d), borderMat);
        mesh.position.set(x,th/2,z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      });

    // orbit controls for camera movement & zoom
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.addEventListener('change', () => {
      console.log('Camera moved to', this.camera.position);
    });

    // handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth/window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private loadDominoPieces(): void {
    const scale = 39;
    // center piece
    this.loader.load('assets/models/pieces/6-6.glb', ({ scene: piece }) => {
      piece.name = 'domino-6-6';
      piece.scale.setScalar(scale);
      piece.position.set(0,0.2,0);
      piece.rotation.x = -Math.PI/2;
      piece.castShadow = true;
      piece.userData['baseY'] = piece.position.y;
      this.scene.add(piece);
      this.createAdjacentPositions(piece.position.clone());
    });
    // hand
    ['6-5','6-4','6-3','6-2','6-1','6-0','5-5'].forEach((id,i) => {
      this.loader.load(`assets/models/pieces/${id}.glb`, ({ scene: piece }) => {
        piece.name = `domino-${id}`;
        piece.scale.setScalar(scale);
        piece.position.set(
          this.handArea.startX + (i%7)*this.handArea.spacing,
          this.handArea.y,
          this.handArea.z );
        piece.rotation.set(-Math.PI/3,0,0);
        piece.castShadow = true;
        piece.userData['baseY'] = piece.position.y;
        this.scene.add(piece);
      });
    });
  }

  private createAdjacentPositions(center: THREE.Vector3): void {
    const geo = new THREE.PlaneGeometry(1,1);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    [{k:'north',x:center.x,z:center.z-2.5},
     {k:'south',x:center.x,z:center.z+0.5},
     {k:'west', x:center.x-1,z:center.z-1},
     {k:'east', x:center.x+1,z:center.z-1}]
      .forEach(o => {
        const m = new THREE.Mesh(geo, mat.clone());
        m.rotation.x = -Math.PI/2;
        m.position.set(o.x,0.1,o.z);
        m.name = `position-${o.k}`;
        this.adjacentPositions[o.k] = m;
        this.scene.add(m);
      });
  }

  private animateLift(obj: THREE.Object3D, lift: boolean): void {
    const baseY = obj.userData['baseY'];
    const tgt = lift? baseY+1: baseY;
    new Tween(obj.position).to({ y: tgt },200).easing(Easing.Quadratic.Out).start();
  }

  private animate(): void {
    this.animationGroup.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('window:mousemove',['$event'])
  onMouseMove(e:MouseEvent): void {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse,this.camera);
    // if dragging piece
    if (this.selectedPiece) {
      const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, point);
      this.selectedPiece.position.set(point.x, this.selectedPiece.userData['baseY'], point.z);
      console.log(`Dragging piece to x:${point.x.toFixed(2)}, z:${point.z.toFixed(2)}`);
      return;
    }
    const hits = this.raycaster.intersectObjects(this.scene.children,true);
    if (!hits.length) { this.clearHover(); return; }
    const obj = hits[0].object;
    if (obj.name.startsWith('domino-')) {
      const p = obj.parent||obj;
      if (p !== this.hoveredPiece) {
        this.clearHover();
        this.hoveredPiece = p;
        this.animateLift(p, true);
      }
    } else this.clearHover();
  }

  private clearHover(): void {
    if (this.hoveredPiece && this.hoveredPiece !== this.selectedPiece) {
      this.animateLift(this.hoveredPiece,false);
    }
    this.hoveredPiece=null;
  }

  @HostListener('window:mousedown',['$event'])
  onMouseDown(e:MouseEvent): void {
    this.updateMouse(e);
    const hits = this.raycaster.intersectObjects(this.scene.children,true);
    if (!hits.length) return;
    const obj = hits[0].object;
    if (obj.name.startsWith('domino-')) {
      this.selectedPiece = obj.parent||obj;
      this.animateLift(this.selectedPiece,true);
      Object.values(this.adjacentPositions).forEach(m=>m.visible=true);
    } else if (obj.name.startsWith('position-') && this.selectedPiece) {
      this.placePiece(this.adjacentPositions[obj.name.split('-')[1]].position);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.selectedPiece) {
      this.animateLift(this.selectedPiece,false);
      this.selectedPiece=null;
      Object.values(this.adjacentPositions).forEach(m=>m.visible=false);
    }
  }

  private placePiece(pos: THREE.Vector3): void {
    if (!this.selectedPiece) return;
    this.selectedPiece.position.copy(pos);
    this.selectedPiece.rotation.set(-Math.PI/2,0,0);
  }

  private updateMouse(e: MouseEvent): void {
    this.mouse.x = (e.clientX/window.innerWidth)*2-1;
    this.mouse.y = -(e.clientY/window.innerHeight)*2+1;
  }
}
