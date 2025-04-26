import { Component, OnInit, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { WebsocketService } from '../../services/websocket.service';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three-stdlib';
import  { Tween, Group, Easing } from '@tweenjs/tween.js';

// export class DominoPiece {
//   public mesh: THREE.Object3D;
//   public name: string;
//   public value1: number;
//   public value2: number;
//   private baseY: number;
//   public isSelected: boolean = false;
//   public isHovered: boolean = false;

//   constructor(mesh: THREE.Object3D, name: string, value1: number, value2: number) {
//     this.mesh = mesh;
//     this.name = name;
//     this.value1 = value1;
//     this.value2 = value2;
//     this.baseY = mesh.position.y;
//     this.mesh.name = name;
//   }

//   setPosition(x: number, y: number, z: number) {
//     this.mesh.position.set(x, y, z);
//   }

//   setRotation(x: number, y: number, z: number) {
//     this.mesh.rotation.set(x, y, z);
//   }

//   setScale(scale: number) {
//     this.mesh.scale.set(scale, scale, scale);
//   }

//   animateLift(lift: boolean, group: any) {
//     const liftHeight = 1;
//     const targetY = lift ? this.baseY + liftHeight : this.baseY;
//     const tween = new Tween(this.mesh.position)
//       .to({ y: targetY }, 200)
//       .easing(Easing.Quadratic.Out)
//       .start();
//     group.add(tween);
//   }
// }


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedObject: THREE.Object3D | null = null;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader = new GLTFLoader();
  private animationId: number = 0;
	private cube!: THREE.Mesh;
	private hoveredObject: THREE.Object3D | null = null;
	private group = new Group();

	private adjacentPositions: { [key: string]: THREE.Mesh } = {};



  // Área definida para a mão do jogador
  private handArea = {
    startX: -3,
    y: 15,
    z: 13.3,
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

							// Armazenar a posição base em Y
							dominoPiece.userData["baseY"] = dominoPiece.position.y;


		
							this.scene.add(dominoPiece);

							// Criar as posições adjacentes após adicionar a peça central
  const centralPosition = dominoPiece.position.clone();
  this.createAdjacentPositions(centralPosition);
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

	animateLift(object: THREE.Object3D, lift: boolean) {
		const liftHeight = 1; // Altura que a peça vai levantar
		const baseY = object.userData["baseY"] || 0; // Posição base em Y
		const targetY = lift ? baseY + liftHeight : baseY;
	
		const tween = new Tween(object.position)
			.to({ y: targetY }, 200) // Duração de 200ms
			.easing(Easing.Quadratic.Out)
			.start();

		 this.group.add(tween)
	}


createAdjacentPositions(centerPosition: THREE.Vector3) {
  const size = 1; // Ajuste conforme necessário
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    opacity: 0.5,
    transparent: true,
    visible: true, // Torne visível para depuração; defina como false depois
  });


  const positions = [
    { name: 'north', x: centerPosition.x, z: centerPosition.z - 2.5 },
    { name: 'south', x: centerPosition.x, z: centerPosition.z + 0.5 },
    { name: 'west', x: centerPosition.x - 1, z: centerPosition.z -1 },
    { name: 'east', x: centerPosition.x + 1, z: centerPosition.z -1 },
  ];

  positions.forEach((pos) => {
    const plane = new THREE.Mesh(geometry, material.clone());
    plane.position.set(pos.x, 0.1, pos.z);
    plane.rotation.x = -Math.PI / 2; // Plano paralelo ao chão
    plane.name = `position-${pos.name}`;
    this.adjacentPositions[pos.name] = plane;
    this.scene.add(plane);
  });
}


  animate = () => {
    // this.animationId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
		this.group.update();
		// this.controls.update();
  };

	@HostListener('window:mousemove', ['$event'])
	onMouseMove(event: MouseEvent) {
		// Atualizar coordenadas do mouse
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	
		this.raycaster.setFromCamera(this.mouse, this.camera);
		const intersects = this.raycaster.intersectObjects(this.scene.children, true);
	
		console.log('objeto:', intersects[0].object.name);

		if (intersects.length > 0 && intersects[0].object.name.startsWith('Low_Domino_0')) {
			const intersected = intersects[0].object;

				console.log('Peça de dominó detectada:', intersected.name);
				const newHoveredObject = intersected.parent instanceof THREE.Object3D ? intersected.parent : intersected;
	
				if (this.hoveredObject !== newHoveredObject) {
					// Restaurar a peça anteriormente "hovered"
					if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
						this.animateLift(this.hoveredObject, false);
					}
	
					// Atualizar a peça atualmente "hovered"
					this.hoveredObject = newHoveredObject;
	
					// Elevar a nova peça, se não estiver selecionada
					if (this.hoveredObject !== this.selectedObject) {
						this.animateLift(this.hoveredObject, true);
					}
				}
			
		} else {
			// Se não houver interseção, restaurar a peça "hovered"
			if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
				this.animateLift(this.hoveredObject, false);
			}
			this.hoveredObject = null;
		}
	
		// // Movimentação da peça selecionada
		// if (this.selectedObject) {
		// 	// Atualizar posição da peça selecionada
		// 	// (Conforme o código atualizado anteriormente)
		// 	const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.selectedObject.position.y);
		// 	const intersectPoint = new THREE.Vector3();
		// 	this.raycaster.ray.intersectPlane(planeY, intersectPoint);
	
		// 	if (intersectPoint) {
		// 		this.selectedObject.position.x = intersectPoint.x;
		// 		this.selectedObject.position.z = intersectPoint.z;
		// 	}
		// }
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
	
			// Verificar se clicou em uma peça
			if (intersected.name.startsWith('Low_Domino_0')) {
				const selected = intersected.parent instanceof THREE.Object3D ? intersected.parent : intersected;
				this.selectPiece(selected);
			}
			// Verificar se clicou em uma posição adjacente
			else if (intersected.name.startsWith('position-') && this.selectedPiece) {
				console.log('Posição adjacente detectada:', intersected.name);
				const positionName = intersected.name.split('-')[1];
				const targetPosition = this.adjacentPositions[positionName].position;
				this.placeSelectedPiece(targetPosition);
			}
		}
	}

	private selectedPiece: THREE.Object3D | null = null;

selectPiece(piece: THREE.Object3D) {
  // Deselecionar a peça anterior, se houver
  if (this.selectedPiece) {
    this.highlightPiece(this.selectedPiece, false);
  }
  this.selectedPiece = piece;
  this.highlightPiece(this.selectedPiece, true);
}

highlightPiece(piece: THREE.Object3D, highlight: boolean) {
  if (highlight) {
    // Elevar a peça ou mudar sua cor
    this.animateLift(piece, true);
  } else {
    this.animateLift(piece, false);
  }
}

updateAdjacentPositionsVisibility(visible: boolean) {
  Object.values(this.adjacentPositions).forEach((plane) => {
    plane.visible = visible;
  });
}

placeSelectedPiece(targetPosition: THREE.Vector3) {
  if (this.selectedPiece) {
    // Mover a peça para a posição alvo
    this.selectedPiece.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
    this.selectedPiece.rotation.set(-Math.PI / 2, 0, 0); // Ajustar a orientação, se necessário

    // Deselecionar a peça
    this.highlightPiece(this.selectedPiece, false);
    this.selectedPiece = null;

    // Atualizar as posições adjacentes (opcional)
    // this.updateAdjacentPositions();
  }
}

	@HostListener('window:mouseup', ['$event'])
	onMouseUp(event: MouseEvent) {
		// if (this.selectedObject) {
		// 	// Encaixar no grid mais próximo
		// 	const gridSize = 1; // Ajuste conforme necessário
		// 	this.selectedObject.position.x = Math.round(this.selectedObject.position.x / gridSize) * gridSize;
		// 	this.selectedObject.position.z = Math.round(this.selectedObject.position.z / gridSize) * gridSize;
	
		// 	// Restaurar a elevação se necessário
		// 	if (this.hoveredObject !== this.selectedObject) {
		// 		this.animateLift(this.selectedObject, false);
		// 	}
		// }
	
		// this.selectedObject = null;
	}
	
}
