import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

const mockRepository = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: ReturnType<typeof mockRepository>;

  const mockUser: Partial<User> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');

      const result = await service.create({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if password is missing', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return undefined if user not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('notfound@example.com');
      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should return a user by ID', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const result = await service.findById(mockUser.id!);
      expect(result).toEqual(mockUser);
    });

    it('should return undefined if user not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const result = await service.findById('nonexistent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      repository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({ data: users, total: 1, page: 1, limit: 20 });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        select: ['id', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle pagination correctly for page 2', async () => {
      repository.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll(2, 10);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, email: 'updated@example.com' };
      repository.findOne
        .mockResolvedValueOnce(mockUser) // findById check
        .mockResolvedValueOnce(null) // findByEmail uniqueness check
        .mockResolvedValueOnce(updatedUser); // findById after update

      const result = await service.update(mockUser.id!, {
        email: 'updated@example.com',
      });

      expect(result.email).toBe('updated@example.com');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { email: 'x@y.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new email is already in use', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockUser) // findById
        .mockResolvedValueOnce({ ...mockUser, id: 'other-id' }); // findByEmail returns another user

      await expect(
        service.update(mockUser.id!, {
          email: 'taken@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password if included in update', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhash');
      repository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser); // after update

      await service.update(mockUser.id!, {
        password: 'newpassword123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    });
  });

  describe('remove', () => {
    it('should soft-delete a user', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockUser.id!);

      expect(repository.softDelete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      repository.findOne.mockResolvedValue({
        id: mockUser.id,
        password: '$2b$10$oldhash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhash');
      repository.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.changePassword(mockUser.id!, 'oldpass', 'newpass'),
      ).resolves.not.toThrow();

      expect(bcrypt.compare).toHaveBeenCalledWith('oldpass', '$2b$10$oldhash');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      repository.findOne.mockResolvedValue({
        id: mockUser.id,
        password: '$2b$10$oldhash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id!, 'wrongpass', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'pass', 'newpass'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRefreshToken', () => {
    it('should hash and store refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedRefreshToken');
      repository.update.mockResolvedValue({ affected: 1 });

      await service.updateRefreshToken(mockUser.id!, 'some-refresh-token');

      expect(bcrypt.hash).toHaveBeenCalledWith('some-refresh-token', 10);
      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        refreshToken: '$2b$10$hashedRefreshToken',
      });
    });

    it('should set refresh token to null on logout', async () => {
      repository.update.mockResolvedValue({ affected: 1 });

      await service.updateRefreshToken(mockUser.id!, null);

      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        refreshToken: null,
      });
    });
  });
});
