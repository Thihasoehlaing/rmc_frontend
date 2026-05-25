import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  profileForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      userDetails: this.fb.group({
        username: [{ value: 'RMC_Admin', disabled: true }],
        firstName: ['RMC', Validators.required],
        lastName: ['RMC', Validators.required],
        email: ['adelmohamad214@gmail.com', [Validators.required, Validators.email]],
        timeZone: ['(MYST) Asia - Kuala Lumpur']
      }),
      changePassword: this.fb.group({
        password: [''],
        confirmPassword: ['']
      }),
      authentication: this.fb.group({
        currentPassword: ['', Validators.required]
      })
    });
  }

  saveProfile() {
    if (this.profileForm.valid) {
      alert('Profile updated successfully!');
    } else {
      alert('Please fill in all required fields, including your current password.');
    }
  }
}
