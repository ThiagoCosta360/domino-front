import { Component, ViewEncapsulation } from "@angular/core";
import { Lobby, WebsocketService } from "../../services/websocket.service";
import { RouterModule, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { UserService } from "../../services/user.service";
import { FormsModule } from "@angular/forms";


@Component({
  selector: "app-lobby",
  templateUrl: "./lobby.component.html",
  styleUrls: ["./lobby.component.scss"],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
	encapsulation: ViewEncapsulation.None
})
export class LobbyComponent {
  public lobby!: Lobby;
  public newRoomName: string = '';
  public userName: string | null;
  public loading: boolean = true;

  constructor(
    private userService: UserService,
    private wsService: WebsocketService,
    private router: Router  // Injeção do serviço Router
  ) {
    this.userName = this.userService.getUser();
    console.log('Entrando no lobby com o nome:', this.userName);
    this.wsService.joinLobby(this.userName);
    this.wsService.onLobbyUpdate().subscribe((message) => {
      console.log('Mensagem de atualização do lobby:', message);
      this.lobby = message;
      this.loading = false;
      console.log('Lobby:', this.lobby.rooms);
    });
  }

  joinRoom(roomId: string) {
    console.log('Entrando na sala:', roomId);
    this.wsService.joinRoom(roomId);

    // Navega para /game após entrar na sala
    this.router.navigate(['/game']);
  }

  createRoom() {
    console.log('Criando sala:', this.newRoomName);
    if (this.newRoomName) {
      this.wsService.createRoom(this.newRoomName);

      // Navega para /game após criar a sala
      this.router.navigate(['/game']);
    }
  }

  logout() {
    this.userService.logout();
		this.router.navigate(['/login']);
  }

	ngAfterViewInit() {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 50 }).map(() => createParticle());

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * 2 * Math.PI,
      };
    }

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y -= p.speed;
        p.x += Math.sin(p.angle) * 0.3;
        if (p.y < -10) p.y = canvas.height + 10;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        ctx.fill();
      });
      requestAnimationFrame(update);
    }
    update();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
	}
}
