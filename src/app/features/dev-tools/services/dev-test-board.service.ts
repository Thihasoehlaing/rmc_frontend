import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DevTestBoard {
  id?: string;
  boardName: string;
  description: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class DevTestBoardService {
  private apiUrl = '/api/dev-test-boards';

  constructor(private http: HttpClient) {}

  createBoard(board: DevTestBoard): Observable<DevTestBoard> {
    return this.http.post<DevTestBoard>(this.apiUrl, board);
  }

  getBoards(): Observable<DevTestBoard[]> {
    return this.http.get<DevTestBoard[]>(this.apiUrl);
  }

  getBoardById(id: string): Observable<DevTestBoard> {
    return this.http.get<DevTestBoard>(`${this.apiUrl}/${id}`);
  }

  updateBoard(id: string, board: DevTestBoard): Observable<DevTestBoard> {
    return this.http.put<DevTestBoard>(`${this.apiUrl}/${id}`, board);
  }

  deleteBoard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
