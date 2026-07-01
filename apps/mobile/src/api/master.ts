import { api } from './client';
import type { CategoryInput, LocationInput } from '@homeasset/shared';

export interface Category {
  id: string;
  name: string;
  assetType: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface Location {
  id: string;
  name: string;
  parentId: string | null;
  memo: string | null;
  sortOrder: number;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get('/api/categories');
  return res.data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const res = await api.post('/api/categories', input);
  return res.data;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const res = await api.put(`/api/categories/${id}`, input);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/api/categories/${id}`);
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await api.get('/api/locations');
  return res.data;
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const res = await api.post('/api/locations', input);
  return res.data;
}

export async function updateLocation(id: string, input: LocationInput): Promise<Location> {
  const res = await api.put(`/api/locations/${id}`, input);
  return res.data;
}

export async function deleteLocation(id: string): Promise<void> {
  await api.delete(`/api/locations/${id}`);
}
