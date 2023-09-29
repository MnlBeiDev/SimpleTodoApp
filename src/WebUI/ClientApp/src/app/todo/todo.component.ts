import { Component, TemplateRef, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import {
  TodoListsClient, TodoItemsClient,
  TodoListDto, TodoItemDto, PriorityLevelDto,
  CreateTodoListCommand, UpdateTodoListCommand,
  CreateTodoItemCommand, UpdateTodoItemDetailCommand
} from '../web-api-client';
import { TagListConfiguration, TagListModel, TagModel } from '../common/tag-list/tag-list.model';

@Component({
  selector: 'app-todo-component',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit {
  debug = false;
  deleting = false;
  deleteCountDown = 0;
  deleteCountDownInterval: any;
  lists: TodoListDto[];
  priorityLevels: PriorityLevelDto[];
  selectedList: TodoListDto;
  selectedItem: TodoItemDto;
  newListEditor: any = {};
  listOptionsEditor: any = {};
  newListModalRef: BsModalRef;
  listOptionsModalRef: BsModalRef;
  deleteListModalRef: BsModalRef;
  itemDetailsModalRef: BsModalRef;
  tagListConfig : TagListConfiguration;
  listViewModel : any;
  itemDetailsFormGroup = this.fb.group({
    id: [null],
    listId: [null],
    priority: [''],
    note: [''],
    tags:['']
  });
  supportedColors : any;
  selectedColor : any;
  tags :any;
  tagListVm : TagListModel;
  tagTextPlaceHolder : string;

  constructor(
    private listsClient: TodoListsClient,
    private itemsClient: TodoItemsClient,
    private modalService: BsModalService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.getTodoList();
  }

  private getTodoList(){
    this.listsClient.get().subscribe(
      result => {
        
        this.lists = result.lists;
        this.priorityLevels = result.priorityLevels;
        if (this.lists.length) {
          this.updateContent();
        }
      },
      error => console.error(error)
    );
  }
  updateContent() {
    this.tagListVm = new TagListModel();
    this.selectedList = this.lists[0];
    this.setSupportedtNoteColors();
    this.updateConfig();
    sessionStorage.setItem("previousListItem", this.selectedList?.items.length > 0 ? JSON.stringify (this.selectedList.items) : '');
    this.mapTagstoVm();
  }

  mapTagstoVm() {
    
    if (!this.selectedList?.items)
      return;
    let tagListLabels : string[] = [];
    this.selectedList.items.forEach(element => {
   
      element.tagList = new TagListModel();

      if (!element.tags)
        return;

      element.tagList.tags = element?.tags.length > 0 ?JSON.parse(element.tags) : [];

      element.tagList.tags.forEach(element => {
        if (!tagListLabels.includes(element.label))
          tagListLabels.push(element.label);
      });

    });


    this.tagTextPlaceHolder =`Available Tags : ${tagListLabels.join(',')}`;
    
  }
  // Lists
  remainingItems(list: TodoListDto): number {
    return list.items.filter(t => !t.done).length;
  }

  showNewListModal(template: TemplateRef<any>): void {
    this.newListModalRef = this.modalService.show(template);
    setTimeout(() => document.getElementById('title').focus(), 250);
  }

  newListCancelled(): void {
    this.newListModalRef.hide();
    this.newListEditor = {};
  }

  addList(): void {
    const list = {
      id: 0,
      title: this.newListEditor.title,
      items: []
    } as TodoListDto;

    this.listsClient.create(list as CreateTodoListCommand).subscribe(
      result => {
        list.id = result;
        this.lists.push(list);
        this.selectedList = list;
        this.newListModalRef.hide();
        this.newListEditor = {};
      },
      error => {
        const errors = JSON.parse(error.response);

        if (errors && errors.Title) {
          this.newListEditor.error = errors.Title[0];
        }

        setTimeout(() => document.getElementById('title').focus(), 250);
      }
    );
  }

  showListOptionsModal(template: TemplateRef<any>) {
    
    this.listOptionsEditor = {
      id: this.selectedList.id,
      title: this.selectedList.title
    };

    this.listOptionsModalRef = this.modalService.show(template);
  }

  updateListOptions() {
    const list = this.listOptionsEditor as UpdateTodoListCommand;
    this.listsClient.update(this.selectedList.id, list).subscribe(
      () => {
        (this.selectedList.title = this.listOptionsEditor.title),
          this.listOptionsModalRef.hide();
        this.listOptionsEditor = {};
      },
      error => console.error(error)
    );
  }

  confirmDeleteList(template: TemplateRef<any>) {
    this.listOptionsModalRef.hide();
    this.deleteListModalRef = this.modalService.show(template);
  }

  deleteListConfirmed(): void {
    this.listsClient.delete(this.selectedList.id).subscribe(
      () => {
        this.deleteListModalRef.hide();
        this.lists = this.lists.filter(t => t.id !== this.selectedList.id);
        this.selectedList = this.lists.length ? this.lists[0] : null;
      },
      error => console.error(error)
    );
  }

  // Items
  showItemDetailsModal(template: TemplateRef<any>, item: TodoItemDto): void {
    
    this.selectedItem = item;
    this.itemDetailsFormGroup.patchValue(this.selectedItem);

    this.itemDetailsModalRef = this.modalService.show(template);
    this.itemDetailsModalRef.onHidden.subscribe(() => {
        this.stopDeleteCountDown();
    });
  }

  updateItemDetails(): void {
    
    const item = new UpdateTodoItemDetailCommand(this.itemDetailsFormGroup.value);

    item.tags = this.tags?.length > 0 ? JSON.stringify(this.tags) : null ;
    
    this.itemsClient.updateItemDetails(this.selectedItem.id, item).subscribe(
      () => {
        if (this.selectedItem.listId !== item.listId) {
          this.selectedList.items = this.selectedList.items.filter(
            i => i.id !== this.selectedItem.id
          );
          const listIndex = this.lists.findIndex(
            l => l.id === item.listId
          );
          this.selectedItem.listId = item.listId;
          this.lists[listIndex].items.push(this.selectedItem);
        }

        this.selectedItem.priority = item.priority;
        this.selectedItem.note = item.note;
        this.selectedItem.tags = item.tags;
        this.itemDetailsModalRef.hide();
        this.itemDetailsFormGroup.reset();
        this.mapTagstoVm();
      },
      error => console.error(error)
    );
  }

  addItem() {
    
   

    const item = {
      id: 0,
      listId: this.selectedList.id,
      priority: this.priorityLevels[0].value,
      title: '',
      done: false
    } as TodoItemDto;

    this.selectedList.items.push(item);
    const index = this.selectedList.items.length - 1;
    this.editItem(item, 'itemTitle' + index);
  }

  editItem(item: TodoItemDto, inputId: string): void {
    this.selectedItem = item;
    setTimeout(() => document.getElementById(inputId).focus(), 100);
  }

  updateItem(item: TodoItemDto, pressedEnter: boolean = false): void {

    const isNewItem = item.id === 0;

    if (!item.title.trim()) {
      this.deleteItem(item);
      return;
    }

    if (item.id === 0) {
      this.itemsClient
        .create({
          ...item, listId: this.selectedList.id
        } as CreateTodoItemCommand)
        .subscribe(
          result => {
            item.id = result;
          },
          error => console.error(error)
        );
    } else {
      this.itemsClient.update(item.id, item).subscribe(
        () => console.log('Update succeeded.'),
        error => console.error(error)
      );
    }

    this.selectedItem = null;

    if (isNewItem && pressedEnter) {
      setTimeout(() => this.addItem(), 250);
    }
  }

  deleteItem(item: TodoItemDto, countDown?: boolean) {
    if (countDown) {
      if (this.deleting) {
        this.stopDeleteCountDown();
        return;
      }
      this.deleteCountDown = 3;
      this.deleting = true;
      this.deleteCountDownInterval = setInterval(() => {
        if (this.deleting && --this.deleteCountDown <= 0) {
          this.deleteItem(item, false);
        }
      }, 1000);
      return;
    }
    this.deleting = false;
    if (this.itemDetailsModalRef) {
      this.itemDetailsModalRef.hide();
    }

    if (item.id === 0) {
      const itemIndex = this.selectedList.items.indexOf(this.selectedItem);
      this.selectedList.items.splice(itemIndex, 1);
    } else {
      this.itemsClient.delete(item.id).subscribe(
        () =>
        (this.selectedList.items = this.selectedList.items.filter(
          t => t.id !== item.id
        )),
        error => console.error(error)
      );
    }
  }

  stopDeleteCountDown() {
    clearInterval(this.deleteCountDownInterval);
    this.deleteCountDown = 0;
    this.deleting = false;
  }

  setSupportedtNoteColors() {
    this.supportedColors = [
      {
        name: 'CHOOSE COLOR',
        value: ''
      },
      {
        name: 'yellow',
        value: '#FFFF66'
      },
      {
        name: 'green',
        value: '#CCFF99'
      },
      {
        name: 'red',
        value: '#FF5733'
      },
      {
        name: 'grey',
        value: '#999999'
      },
      {
        name: 'white',
        value: '#FFFFFF'
      }, {
        name: 'orange',
        value: '#FFC300'
      },
      {
        name: 'blue',
        value: '#6666FF'
      },
      {
        name: 'purple',
        value: '#9966CC'
      }
    ]

    this.supportedColors = this.supportedColors.sort();
  }


  addTag(eventData,isFilter = false){
   
    if (!eventData)
      return;

    this.tags = eventData?.tags;
    
    if (isFilter)
    {
      this.filterTags(this.tags);
      this.mapTagstoVm();
    }
  }

  delTag(eventData, isFilter = false){

    if (!eventData)
      return;

    this.tags = eventData?.tags;

    if(isFilter){
      this.filterTags(this.tags);
      this.mapTagstoVm();
    }   
  }

  filterTags(tags){
  
    let listItem : any[] =  this.selectedList.items;

    if (!tags || tags.length == 0) {
      this.getTodoList();

      return;
    }

  this.selectedList.items = [];

    for (let tagIndex = 0; tagIndex < tags.length; tagIndex++) {
      
      let currentTag = tags[tagIndex];
      
       for (let itemIndex = 0; itemIndex < listItem.length; itemIndex++) {
        let currentItem  = listItem[itemIndex];
        
        let parsedTags = currentItem.tags ? JSON.parse(currentItem.tags) : "";
        
        if (!parsedTags)
            continue;

          let isMatched =  parsedTags.find(x => x.label.includes(currentTag.label));
          
          if (isMatched && !this.selectedList.items.includes(currentItem))
            this.selectedList.items.push(currentItem);
       }
    }
  }

  // configuration for color and separated keys to make it dynamic
  updateConfig() {
    this.tagListConfig = {
      color: "#0d6efd",
      separatorKeysCodes: [ENTER, COMMA]
    }    
  }

  searchByTitle(text) {
    
    if (!text?.target?.value) {
      this.getTodoList();
      return;
    }
    let filteredList = this.selectedList.items.filter(x => x.title.includes(text?.target?.value));
    this.selectedList.items = filteredList;

  }
}