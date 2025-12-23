import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  Profile,
  UpdateProfileData,
  AdminUpdateProfileData,
  PasswordResetRequest,
  PasswordUpdateRequest
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(true);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.loadUserProfile(session.user.id);
      } else {
        this.currentUserSubject.next(null);
      }
      this.loadingSubject.next(false);
    });

    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      await this.loadUserProfile(session.user.id);
    }
    this.loadingSubject.next(false);
  }

  private async loadUserProfile(userId: string) {
    try {
      const { data: profile, error } = await this.supabase.db
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        const authUser: AuthUser = {
          id: userId,
          email: profile.email,
          profile: profile as Profile
        };
        this.currentUserSubject.next(authUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async register(credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.full_name
          }
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      if (data.user) {
        await this.loadUserProfile(data.user.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
  }

  async resetPassword(request: PasswordResetRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Password reset failed' };
    }
  }

  async updatePassword(request: PasswordUpdateRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: request.password
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Password update failed' };
    }
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.db
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      await this.loadUserProfile(userId);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Profile update failed' };
    }
  }

  async adminUpdateProfile(userId: string, data: AdminUpdateProfileData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.db
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Admin profile update failed' };
    }
  }

  async getAllProfiles(): Promise<{ data: Profile[] | null; error?: string }> {
    try {
      const { data, error } = await this.supabase.db
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data as Profile[] };
    } catch (error: any) {
      return { data: null, error: error.message || 'Failed to fetch profiles' };
    }
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.profile?.role === 'admin' && user?.profile?.is_active === true;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }
}
