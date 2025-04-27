import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { Tween, Easing, update as tweenUpdate } from '@tweenjs/tween.js';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  // ────────────────────────────────────────────────────────────────────────────
  //  Cena, câmera e renderizador
  // ────────────────────────────────────────────────────────────────────────────
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // ────────────────────────────────────────────────────────────────────────────
  //  Utilidades ThreeJS
  // ────────────────────────────────────────────────────────────────────────────
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private loader = new GLTFLoader();

  // ────────────────────────────────────────────────────────────────────────────
  //  Estado de interação
  // ────────────────────────────────────────────────────────────────────────────
  private selectedPiece: THREE.Object3D | null = null;
  private hoveredPiece: THREE.Object3D | null = null;
  private dragOffset = new THREE.Vector3();
  private dragPlane = new THREE.Plane();
  private originalPos = new THREE.Vector3();

  private adjacentPositions: Record<string, THREE.Mesh> = {};
  private handArea = { startX: -3, y: 15, z: 13.3, spacing: 1 };

  constructor(private wsService: WebsocketService) {}

  // ────────────────────────────────────────────────────────────────────────────
  //  Ciclo de vida Angular
  // ────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.loadDominoPieces();
    this.renderer.setAnimationLoop(() => this.animate());
  }

  ngOnDestroy(): void {
    this.renderer.dispose();
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Configuração ThreeJS
  // ────────────────────────────────────────────────────────────────────────────
  private initThreeJS(): void {
    // Câmera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 23, 15);
    this.camera.lookAt(0, 0, 0);

    // Renderizador
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x5b3a29);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Iluminação
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Mesa
    const size = 20;
    new THREE.TextureLoader().load(
      'assets/textures/wood_table.jpg',
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size),
          new THREE.MeshPhongMaterial({ map: tex })
        );
        board.rotation.x = -Math.PI / 2;
        board.receiveShadow = true;
        this.scene.add(board);
      },
      undefined,
      () => {
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(size, size),
          new THREE.MeshPhongMaterial({ color: 0xdeb887 })
        );
        board.rotation.x = -Math.PI / 2;
        board.receiveShadow = true;
        this.scene.add(board);
      }
    );

    // Bordas da mesa
    const borderMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const t = 0.5,
      h = 1;
    [
      [size + 2 * t, t, t, 0, -size / 2 - t / 2],
      [size + 2 * t, t, t, 0, size / 2 + t / 2],
      [t, t, size, -size / 2 - t / 2, 0],
      [t, t, size, size / 2 + t / 2, 0],
    ].forEach(([w, th, d, x, z]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w as number, th as number, d as number), borderMat);
      mesh.position.set(x as number, (th as number) / 2, z as number);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });

    // Resize handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Carregamento das peças
  // ────────────────────────────────────────────────────────────────────────────
  private loadDominoPieces(): void {
    const scale = 39;

    // Peça central
    this.loader.load('assets/models/pieces/6-6.glb', ({ scene: piece }) => {
      piece.name = 'domino-6-6';
      piece.scale.setScalar(scale);
      piece.position.set(0, 0.2, 0);
      piece.rotation.x = -Math.PI / 2;
      piece.castShadow = true;
      piece.userData['baseY'] = piece.position.y;
      this.scene.add(piece);
      this.createAdjacentPositions(piece.position.clone());
    });

    // Peças da mão
    ['6-5', '6-4', '6-3', '6-2', '6-1', '6-0', '5-5'].forEach((id, i) => {
      this.loader.load(`assets/models/pieces/${id}.glb`, ({ scene: piece }) => {
        piece.name = `domino-${id}`;
        piece.scale.setScalar(scale);
        piece.position.set(
          this.handArea.startX + (i % 7) * this.handArea.spacing,
          this.handArea.y,
          this.handArea.z
        );
        piece.rotation.set(-Math.PI / 3, 0, 0);
        piece.castShadow = true;
        piece.userData['baseY'] = piece.position.y;
        this.scene.add(piece);
      });
    });
  }

  private createAdjacentPositions(center: THREE.Vector3): void {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    [
      { key: 'north', x: center.x, z: center.z - 2.5 },
      { key: 'south', x: center.x, z: center.z + 0.5 },
      { key: 'west', x: center.x - 1, z: center.z - 1 },
      { key: 'east', x: center.x + 1, z: center.z - 1 },
    ].forEach((o) => {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(o.x, 0.1, o.z);
      mesh.name = `position-${o.key}`;
      mesh.visible = false;
      this.adjacentPositions[o.key] = mesh;
      this.scene.add(mesh);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Utilidades diversas
  // ────────────────────────────────────────────────────────────────────────────
  private getDominoObject(obj: THREE.Object3D): THREE.Object3D | null {
    let o: THREE.Object3D | null = obj;
    while (o && !o.name.startsWith('domino-')) {
      o = o.parent;
    }
    return o;
  }

  private animateLift(obj: THREE.Object3D, lift: boolean): void {
    const baseY = obj.userData['baseY'];
    const targetY = lift ? baseY + 1 : baseY;
    new Tween(obj.position).to({ y: targetY }, 200).easing(Easing.Quadratic.Out).start();
  }

  private animate(): void {
    tweenUpdate();
    this.renderer.render(this.scene, this.camera);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Eventos de mouse
  // ────────────────────────────────────────────────────────────────────────────
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.updateMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // ── Se estamos arrastando, move a peça ────────────────────────────────
    if (this.selectedPiece) {
      const intersectPoint = new THREE.Vector3();
      const baseY = this.selectedPiece.userData['baseY'];

      // Plano na altura da peça
      this.dragPlane.set(new THREE.Vector3(0, 1, 0), -baseY);
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
      this.selectedPiece.position.set(
        intersectPoint.x + this.dragOffset.x,
        baseY,
        intersectPoint.z + this.dragOffset.z
      );
      return; // ignorar lógica de hover enquanto arrasta
    }

    // ── Hover quando não há arraste ────────────────────────────────────────
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    if (!hits.length) {
      this.clearHover();
      return;
    }
    const dom = this.getDominoObject(hits[0].object);
    if (dom && dom !== this.hoveredPiece) {
      this.clearHover();
      this.hoveredPiece = dom;
      this.animateLift(dom, true);
    } else if (!dom) {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredPiece && this.hoveredPiece !== this.selectedPiece) {
      this.animateLift(this.hoveredPiece, false);
    }
    this.hoveredPiece = null;
  }

  @HostListener('window:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.updateMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    if (!hits.length) return;

    const dom = this.getDominoObject(hits[0].object);
    if (dom) {
      this.selectedPiece = dom;
      this.animateLift(dom, true);

      // Calcula offset para que o cursor "agarre" a posição exata sobre a peça
      const baseY = dom.userData['baseY'];
      const intersectPoint = new THREE.Vector3();
      this.dragPlane.set(new THREE.Vector3(0, 1, 0), -baseY);
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
      this.dragOffset.subVectors(dom.position, intersectPoint);
      this.originalPos.copy(dom.position);

      Object.values(this.adjacentPositions).forEach((m) => (m.visible = true));
      event.preventDefault();
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.selectedPiece) return;

    this.updateMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(Object.values(this.adjacentPositions));
    if (hits.length) {
      // Snap na posição mais próxima
      const pos = hits[0].object.position;
      new Tween(this.selectedPiece.position)
        .to({ x: Math.round(pos.x), y: this.selectedPiece.userData['baseY'], z: Math.round(pos.z) }, 150)
        .easing(Easing.Quadratic.Out)
        .start();
      this.selectedPiece.rotation.set(-Math.PI / 2, 0, 0);
    } else {
      // Soltou fora: volta para a origem
      new Tween(this.selectedPiece.position)
        .to(this.originalPos, 200)
        .easing(Easing.Quadratic.Out)
        .start();
    }

    this.animateLift(this.selectedPiece, false);
    this.selectedPiece = null;
    this.dragOffset.set(0, 0, 0);
    Object.values(this.adjacentPositions).forEach((m) => (m.visible = false));
  }

  private updateMouseCoords(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
}
