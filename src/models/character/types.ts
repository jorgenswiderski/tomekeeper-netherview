import { ICharacterOption } from '@jorgenswiderski/tomekeeper-shared/dist/types/character-feature-customization-option';
import { ISpell } from '@jorgenswiderski/tomekeeper-shared/dist/types/action';
import { GrantableEffect } from '@jorgenswiderski/tomekeeper-shared/dist/types/grantable-effect';
import {
    EquipmentSlot,
    IEquipmentItem,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/equipment-item';
import { CharacterClassProgression } from '../../api/weave/types';
import { CharacterTreeDecision } from './character-tree-node/character-tree';
import { CharacterEquipment } from '../items/types';

// FIXME: Convert to enum instead of string labels
export interface AbilityScores {
    Strength: number;
    Dexterity: number;
    Constitution: number;
    Intelligence: number;
    Wisdom: number;
    Charisma: number;
}

export interface CharacterRaceOption extends ICharacterOption {}

export interface CharacterClassOption extends ICharacterOption {
    level: number;
    progression: CharacterClassProgression;
}

export interface CharacterBackgroundOption extends ICharacterOption {
    id: number;
}

export interface ICharacter {
    clone(): ICharacter;
    baseClassData: CharacterClassOption[];
    spellData: ISpell[];
    getTotalAbilityScores(): AbilityScores | null;
    getClassInfo(): CharacterClassInfo[];
    getEquipment(): CharacterEquipment;
    equipItem(slot: EquipmentSlot, item: IEquipmentItem): ICharacter;
    getCurrentClassData(): ICharacterOption[];
    getEquipmentSlotFilters(): Record<
        EquipmentSlot,
        (item: IEquipmentItem) => boolean
    >;
    getEquipmentSlotDisableStatus(): Record<number, boolean>;
}

export interface CharacterClassLevelInfo {
    node: CharacterTreeDecision;
    totalEffects: GrantableEffect[]; // excludes effects for subsequent levels
}

export interface CharacterClassInfo {
    levels: CharacterClassLevelInfo[];
    class: CharacterClassOption;
    subclass?: CharacterTreeDecision;
}
