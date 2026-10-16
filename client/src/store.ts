import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Profile, ProfileInput } from './types';
export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const profilesApi = createApi({
  reducerPath: 'profilesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  tagTypes: ['Profiles'],
  endpoints: (b) => ({
    getProfiles: b.query<Profile[], void>({
      query: () => '/users',
      providesTags: ['Profiles'],
    }),
    getProfile: b.query<Profile, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Profiles', id }],
    }),
    createProfile: b.mutation<Profile, ProfileInput>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['Profiles'],
    }),
    updateProfile: b.mutation<Profile, { id: string; body: ProfileInput }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Profiles'],
    }),
    deleteProfile: b.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Profiles'],
    }),
  }),
});
export const {
  useGetProfilesQuery,
  useGetProfileQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
} = profilesApi;
export const store = configureStore({
  reducer: { [profilesApi.reducerPath]: profilesApi.reducer },
  middleware: (g) => g().concat(profilesApi.middleware),
});
export function errorMessage(e: unknown) {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = e.data as { message?: string | string[] };
    return Array.isArray(data.message)
      ? data.message.join(' ')
      : data.message || 'Something went wrong. Please try again.';
  }
  return 'Unable to reach the API. Check your connection and try again.';
}
