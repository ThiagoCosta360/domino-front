import { Component } from "@angular/core";
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
  }
}
