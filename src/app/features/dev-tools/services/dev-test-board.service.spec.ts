import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DevTestBoardService, DevTestBoard } from './dev-test-board.service';

describe('DevTestBoardService', () => {
  let service: DevTestBoardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DevTestBoardService],
    });

    service = TestBed.inject(DevTestBoardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a board', () => {
    const mockBoard: DevTestBoard = {
      boardName: 'Test Board',
      description: 'Test Description',
      status: 'active',
    };

    service.createBoard(mockBoard).subscribe((result) => {
      expect(result.boardName).toBe('Test Board');
    });

    const req = httpMock.expectOne('/rmc/dev-test-boards');
    expect(req.request.method).toBe('POST');
    req.flush(mockBoard);
  });
});
