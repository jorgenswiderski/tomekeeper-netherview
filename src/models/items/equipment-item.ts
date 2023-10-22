import {
    EquipmentItemProficiency,
    EquipmentItemType,
    IEquipmentItem,
    ItemRarity,
} from 'planner-types/src/types/equipment-item';
import { GrantableEffect } from 'planner-types/src/types/grantable-effect';
import { StaticReference } from '../compressor/static-reference/static-reference';
import {
    StaticReferenceHandle,
    StaticallyReferenceable,
} from '../compressor/static-reference/types';
import { WeaveApi } from '../../api/weave/weave';

let ref: {
    pool: Map<number, EquipmentItem>;
    create: (id: number) => StaticReferenceHandle;
};

export class EquipmentItem implements IEquipmentItem, StaticallyReferenceable {
    name: string;
    image: string;
    icon: string;
    description?: string;
    quote: string;
    type: EquipmentItemType;
    proficiency: EquipmentItemProficiency;
    baseArmorClass?: number;
    bonusArmorClass?: number;
    enchantment?: number;
    rarity: ItemRarity;
    weightKg?: number;
    weightLb?: number;
    price?: number;
    uid?: string;
    effects: GrantableEffect[];
    source?: string;
    notes: string[];
    id: number;

    constructor(item: IEquipmentItem) {
        this.name = item.name;
        this.image = item.image;
        this.icon = item.icon;
        this.description = item.description;
        this.quote = item.quote;
        this.type = item.type;
        this.proficiency = item.proficiency;
        this.baseArmorClass = item.baseArmorClass;
        this.bonusArmorClass = item.bonusArmorClass;
        this.enchantment = item.enchantment;
        this.rarity = item.rarity;
        this.weightKg = item.weightKg;
        this.weightLb = item.weightLb;
        this.price = item.price;
        this.uid = item.uid;
        this.effects = item.effects;
        this.source = item.source;
        this.notes = item.notes;
        this.id = item.id;

        ref.pool.set(this.id, this);
    }

    toJSON(): StaticReferenceHandle {
        return ref.create(this.id);
    }

    static async fromId(id: number): Promise<EquipmentItem> {
        const itemData = await WeaveApi.getEquipmentItemInfoById(id);

        return new EquipmentItem(itemData);
    }
}

ref = StaticReference.registerClass(EquipmentItem, 'e');