export class TagListModel
{
    tags : TagModel[];

    constructor(){
        this.tags = [];
    }
}

export class TagModel
{
    order : number;
    label : string;
}

export class TagListConfiguration{
    color : string;
    separatorKeysCodes : number[];
}