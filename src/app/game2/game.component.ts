import { Component, OnInit, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { WebsocketService } from '../../services/websocket.service';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three-stdlib';
import  { Tween, Group, Easing } from '@tweenjs/tween.js';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
// domino-game.ts

class DominoPiece {
  value1: number;
  value2: number;

  constructor(value1: number, value2: number) {
    this.value1 = value1;
    this.value2 = value2;
  }

  // Verifica se a peça pode ser conectada a outra peça
  canConnectTo(otherPiece: DominoPiece): boolean {
    // TODO: Implementar lógica de conexão
    return (
      this.value1 === otherPiece.value1 ||
      this.value1 === otherPiece.value2 ||
      this.value2 === otherPiece.value1 ||
      this.value2 === otherPiece.value2
    );
  }

  // Retorna os valores da peça
  getValues(): [number, number] {
    return [this.value1, this.value2];
  }
}

class Player {
  name: string;
  hand: DominoPiece[] = [];
  team: Team | null = null;

  constructor(name: string) {
    this.name = name;
  }

  // Adiciona uma peça à mão do jogador
  addPieceToHand(piece: DominoPiece) {
    this.hand.push(piece);
  }

  // Remove uma peça da mão do jogador
  removePieceFromHand(piece: DominoPiece) {
    const index = this.hand.indexOf(piece);
    if (index > -1) {
      this.hand.splice(index, 1);
    }
  }

  // Jogador joga uma peça
  playPiece(board: Board): DominoPiece | null {
    // TODO: Implementar lógica para escolher qual peça jogar
    // Por enquanto, retorna a primeira peça disponível
    if (this.hand.length > 0) {
      const piece = this.hand[0];
      this.removePieceFromHand(piece);
      return piece;
    }
    return null;
  }

  // Mostra a mão do jogador
  showHand() {
    // TODO: Implementar visualização da mão
  }
}

class Team {
  name: string;
  players: Player[] = [];
  score: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  // Adiciona um jogador à equipe
  addPlayer(player: Player) {
    this.players.push(player);
    player.team = this;
  }

  // Atualiza o placar da equipe
  updateScore(points: number) {
    this.score += points;
  }

  // Retorna o placar atual
  getScore(): number {
    return this.score;
  }
}

class Board {
  pieces: DominoPiece[] = [];

  // Adiciona uma peça ao tabuleiro
  placePiece(piece: DominoPiece): boolean {
    // TODO: Implementar lógica para posicionar a peça corretamente
    this.pieces.push(piece);
    return true;
  }

  // Retorna as posições válidas para jogar
  getValidPositions(): DominoPiece[] {
    // TODO: Implementar lógica para determinar posições válidas
    return [];
  }

  // Exibe o estado atual do tabuleiro
  displayBoard() {
    // TODO: Implementar visualização do tabuleiro
  }
}

class DominoGame {
  players: Player[] = [];
  teams: Team[] = [];
  board: Board = new Board();
  boneyard: DominoPiece[] = [];
  currentPlayerIndex: number = 0;
  maxScore: number = 100; // Pontuação máxima para vencer o jogo

  constructor() {
    this.initializeGame();
  }

  // Inicializa o jogo, criando peças e equipes
  initializeGame() {
    this.createTeams();
    this.createPlayers();
    this.createPieces();
    this.dealPieces();
  }

  // Cria as equipes
  createTeams() {
    const team1 = new Team('Equipe 1');
    const team2 = new Team('Equipe 2');
    this.teams.push(team1, team2);
  }

  // Cria os jogadores e os adiciona às equipes
  createPlayers() {
    const playerNames = ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4'];
    for (let i = 0; i < 4; i++) {
      const player = new Player(playerNames[i]);
      this.players.push(player);
      // Distribui os jogadores nas equipes
      this.teams[i % 2].addPlayer(player);
    }
  }

  // Cria todas as peças do dominó
  createPieces() {
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        this.boneyard.push(new DominoPiece(i, j));
      }
    }
    this.shufflePieces();
  }

  // Embaralha as peças
  shufflePieces() {
    for (let i = this.boneyard.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.boneyard[i], this.boneyard[j]] = [this.boneyard[j], this.boneyard[i]];
    }
  }

  // Distribui as peças para os jogadores
  dealPieces() {
    const piecesPerPlayer = 4;
    for (let i = 0; i < piecesPerPlayer; i++) {
      for (const player of this.players) {
        const piece = this.boneyard.pop();
        if (piece) {
          player.addPieceToHand(piece);
        }
      }
    }
  }

  // Inicia o jogo
  startGame() {
    // TODO: Implementar lógica para iniciar o jogo
    this.playTurn();
  }

  // Controla a vez dos jogadores
  playTurn() {
    const currentPlayer = this.players[this.currentPlayerIndex];
    const piece = currentPlayer.playPiece(this.board);

    if (piece) {
      const success = this.board.placePiece(piece);
      if (success) {
        // TODO: Verificar se o jogo terminou ou passou a vez
        this.nextPlayer();
      } else {
        // TODO: Implementar lógica caso o jogador não possa jogar
      }
    } else {
      // TODO: Implementar lógica caso o jogador não tenha peças para jogar
    }
  }

  // Passa a vez para o próximo jogador
  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    // Continua o jogo
    this.playTurn();
  }

  // Verifica se o jogo terminou
  checkGameOver(): boolean {
    // TODO: Implementar condições de fim de jogo
    return false;
  }

  // Calcula o placar das equipes
  calculateScore() {
    // TODO: Implementar cálculo de pontuação
  }

  // Finaliza o jogo e declara o vencedor
  endGame() {
    // TODO: Implementar lógica de finalização do jogo
  }

  // Salva o estado atual do jogo (nova ideia)
  saveGameState() {
    // TODO: Implementar funcionalidade de salvar o jogo
  }

  // Carrega um estado salvo do jogo (nova ideia)
  loadGameState() {
    // TODO: Implementar funcionalidade de carregar um jogo salvo
  }

  // Sugere uma jogada para o jogador (nova ideia)
  suggestMove(player: Player): DominoPiece | null {
    // TODO: Implementar lógica para sugerir uma jogada
    return null;
  }

  // Desfaz a última jogada (nova ideia)
  undoLastMove() {
    // TODO: Implementar funcionalidade de desfazer a última jogada
  }
}

// Exemplo de uso
const game = new DominoGame();
game.startGame();


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit{

	constructor(
		private wsService: WebsocketService, 
		private userService: UserService,
		private router: Router
	) {
		if (!this.userService.getUser()) {
			this.login();
		}
	}

	login() {
		this.router.navigate(['/login']);
	}


	ngOnInit(): void {
    // this.wsService.onMessage().subscribe((message) => {
    //   console.log('Mensagem teste recebida do servidor:', message);
    // });

    // this.wsService.sendMessage('Olá do cliente!');
  }
}
