import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export interface Lobby {
	rooms: {
		id: string;
		name: string;
		players: string[]
	}[]
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

	joinLobby(username: string | null): void {
		this.socket.emit('joinLobby', {username}	);
	}

	onLobbyUpdate(): Observable<Lobby> {
		return new Observable(observer => {
			this.socket.on('lobbyUpdate', (data: Lobby) => {
				observer.next(data);
			});
		});
	}

	joinRoom(roomId: string): void {
		this.socket.emit('joinRoom', {roomId});
	}

	createRoom(name: string): void {
		this.socket.emit('createRoom', {name});
	}
}