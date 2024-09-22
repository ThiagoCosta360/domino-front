import { Component, OnInit, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { WebsocketService } from '../../services/websocket.service';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three-stdlib';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedObject: THREE.Object3D | null = null;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  // private controls!: OrbitControls;
  private loader = new GLTFLoader();
  private animationId: number = 0;
	private cube!: THREE.Mesh;

  // Área definida para a mão do jogador
  private handArea = {
    startX: -3,
    y: 15,
    z: 14.3,
    spacing: 1,
  };

  // constructor(private wsService: WebsocketService) {}

  ngOnInit(): void {
    // this.wsService.onMessage().subscribe((message) => {
    //   console.log('Mensagem recebida do servidor:', message);
    // });

    // this.wsService.sendMessage('Olá do cliente!');
  }

	ngAfterViewInit(): void {
		this.initThreeJS();
		this.loadDominoPieces();
		// this.animate();
		this.renderer.setAnimationLoop( this.animate );
	}

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }

  initThreeJS() {
    // Configuração da câmera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Configuração do renderizador
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10).normalize();
    this.scene.add(directionalLight);

		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(10, 10, 10);
		this.scene.add(pointLight);

		this.camera.position.set(0, 25, 15);
		this.camera.lookAt(0, 0, 3);

    // Mesa quadriculada
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x888888);
    this.scene.add(gridHelper);

		// Controles de órbita
		// this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		// this.controls.enableDamping = true;
		// this.controls.dampingFactor = 0.1;
		// this.controls.enablePan = true;
		// this.controls.minDistance = 10;
		// this.controls.maxDistance = 100;
		// this.controls.maxPolarAngle = Math.PI / 2;

  }

  loadDominoPieces() {
		const totalPieces = 28; // Dominó padrão (0-0 até 6-6)
		let loadedPieces = 0;
		const p = 39 //proportion

		this.loader.load( 'assets/models/pieces/6-6.glb',  ( gltf ) =>  {
							const dominoPiece = gltf.scene;
							dominoPiece.name = `domino-6-6`;
							
		
							// Configurar escala adequada
							dominoPiece.scale.set(p,p, p);


							dominoPiece.position.set(0.5, 0.1, 0);
							dominoPiece.rotation.set(-Math.PI / 2, 0, 0); // Deitado sobre a mesa
		
							this.scene.add(dominoPiece);
						}, undefined, function ( error ) {
		
			console.error( error );
		} );

		const hand = ["6-5", "6-4", "6-3", "6-2", "6-1", "6-0", "5-5"];
		for (const piece of hand) {
				
				const fileName = `assets/models/pieces/${piece}.glb`;
				this.loader.load(
					fileName,
					(gltf) => {
						const dominoPiece = gltf.scene;
						dominoPiece.name = `domino-${piece}`;
	
						// Configurar escala adequada
						dominoPiece.scale.set(p, p, p);
	
						// Posicionar inicialmente na área da mão do jogador
						const index = loadedPieces;
						const x =
							this.handArea.startX +
							(index % 7) * this.handArea.spacing 
						const z = this.handArea.z;
	
						dominoPiece.position.set(x, this.handArea.y, z);
						dominoPiece.rotation.set(-Math.PI / 3, 0, 0); // Deitado sobre a mesa
	
						this.scene.add(dominoPiece);
						console.log(`Peça carregada: domino-${piece} na posição (${x}, ${this.handArea.y}, ${z})`);
						loadedPieces++;
					},
					undefined,
					(error) => {
						console.error(`Erro ao carregar a peça ${piece}:`, error);
					}
				);
			}
		
	}
	

  animate = () => {
    // this.animationId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
		// this.controls.update();
  };

  // Event listeners  para detectar o clique e arrastar
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Atualizar coordenadas do mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (this.selectedObject) {
      // Atualizar posição da peça selecionada com base na posição do mouse
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(planeY, intersectPoint);

      if (intersectPoint) {
        this.selectedObject.position.x = intersectPoint.x;
        this.selectedObject.position.z = intersectPoint.z;
      }
    }
  }

  @HostListener('window:mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    // Atualizar coordenadas do mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const intersected = intersects[0].object;
      // Encontrar o pai mais próximo que representa a peça completa
      this.selectedObject = intersected.parent instanceof THREE.Object3D ? intersected.parent : intersected;
      
      // Trazer a peça para frente
      if (this.selectedObject) {
        this.selectedObject.parent?.add(this.selectedObject);
      }
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.selectedObject = null;
  }
}
