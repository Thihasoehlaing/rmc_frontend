import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { FormCacheService } from './form-cache.service';
import { ToastService } from './toast.service';
import { WorkspaceService } from './workspace.service';

const applicant = {id: 1, username: 'sample', name: 'Sample', email: 'sample@apu.edu.my', department: 'School of Computing', distinguished_name: '', photo_url: null, role: {id: 7, code: 'APPLICANT', name: 'Applicant'}};

function setup(academicEligible?: boolean) {
  localStorage.setItem('token', 'dev:sample');
  localStorage.setItem('user', JSON.stringify({...applicant, ...(academicEligible === undefined ? {} : {academic_eligible: academicEligible})}));
  TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting(),
    {provide: Router, useValue: {}},
    {provide: FormCacheService, useValue: {clear: vi.fn()}},
    {provide: ToastService, useValue: {}},
    {provide: WorkspaceService, useValue: {current: () => null}},
  ]});
  return {auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController)};
}

afterEach(() => { localStorage.clear(); TestBed.resetTestingModule(); });

describe('saved-session role migration', () => {
  it('restores academic form permissions from the API for an older Applicant session', () => {
    const {auth, http} = setup();
    expect(auth.currentUser()?.groups).toEqual(['Applicant']);
    const first = auth.refreshStoredSession();
    expect(auth.refreshStoredSession()).toBe(first);
    first.subscribe(valid => expect(valid).toBe(true));
    http.expectOne(`${environment.apiUrl}/auth/check`).flush({success: true, message: 'OK', data: {user: {...applicant, academic_eligible: true}}});
    expect(auth.currentUser()?.groups).toContain('academic');
    expect(JSON.parse(localStorage.getItem('user')!).academic_eligible).toBe(true);
    auth.refreshStoredSession().subscribe();
    http.verify();
  });

  it('does not grant academic permissions to a refreshed non-academic Applicant', () => {
    const {auth, http} = setup();
    auth.refreshStoredSession().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/check`).flush({success: true, message: 'OK', data: {user: {...applicant, academic_eligible: false}}});
    expect(auth.currentUser()?.groups).toEqual(['Applicant']);
    http.verify();
  });

  it('does not refetch an already upgraded saved session', () => {
    const {auth, http} = setup(true);
    auth.refreshStoredSession().subscribe(valid => expect(valid).toBe(true));
    expect(auth.currentUser()?.groups).toContain('academic');
    http.verify();
  });

  it('clears a saved session when the account is no longer authorized', () => {
    const {auth, http} = setup();
    auth.refreshStoredSession().subscribe(valid => expect(valid).toBe(false));
    http.expectOne(`${environment.apiUrl}/auth/check`).flush({}, {status: 403, statusText: 'Forbidden'});
    expect(auth.isAuthenticated()).toBe(false);
    http.verify();
  });
});
