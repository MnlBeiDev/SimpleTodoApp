

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { TagListConfiguration, TagListModel, TagModel } from './tag-list.model';

@Component({
    selector: 'tag-list',
    templateUrl: 'tag-list.component.html',
    styleUrls: ['tag-list.component.css'],
})
export class TagListComponent implements OnInit {

    ngOnInit(): void {
        this.order = 0;
        this.viewModel = new TagListModel();
    }

    visible = true;
    selectable = true;
    removable = true;
    order : number;

    @Input() viewModel : TagListModel;
    @Input() config : TagListConfiguration;
    //readonly separatorKeysCodes: number[] = [ENTER, COMMA];

    @Output() newTagEvent = new EventEmitter<TagListModel>();
    @Output() delTagEvent = new EventEmitter<TagListModel>();
    Tags: string[] = [];
   
    add(event: MatChipInputEvent): void {
    
        const input = event.input;
        const value = event.value;

        if (!value || '')
            return;

        if (input) {
            input.value = '';
        }
       
        this.order++;

        const newTag: TagModel = {
            order: this.order,
            label: value
        }

        if (this.viewModel.tags.find(x=> x.label == newTag.label))
            return;

        this.viewModel.tags.push(newTag);

        this.newTagEvent.emit(this.viewModel);
    }


    remove(tag: string): void {
        const index = this.viewModel?.tags.findIndex( x=> x.label === tag?.trim());

        if (index >= 0) {
            this.viewModel.tags.splice(index, 1);
        }
        
        this.delTagEvent.emit(this.viewModel);
    }
}
