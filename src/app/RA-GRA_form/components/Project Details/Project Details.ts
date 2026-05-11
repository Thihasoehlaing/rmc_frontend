import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ValidationMessageComponent } from '../../../shared/components/validation-message/validation-message.component';
import { CustomSubheaderComponent } from '../../../shared/components/custom-subheader/custom-subheader.component';
import { NoteComponent } from '../../../shared/components/note/note.component';

@Component({
  selector: 'app-ragra-project-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ValidationMessageComponent, CustomSubheaderComponent, NoteComponent],
  templateUrl: './Project Details.html',
  styleUrls: ['./Project Details.scss']
})
export class ProjectDetailsComponent implements OnInit {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  
  form!: FormGroup;
  @Output() formValidityChange = new EventEmitter<boolean>();

  ngOnInit() {
    this.form = this.fb.group({
      schoolName: ['', Validators.required],
      positionRequested: ['', Validators.required],
      applicationType: ['', Validators.required],
      placement: ['', Validators.required],
      year: ['', Validators.required]
    });

    this.form.statusChanges.subscribe(status => {
      this.formValidityChange.emit(status === 'VALID');
    });
  }
}
