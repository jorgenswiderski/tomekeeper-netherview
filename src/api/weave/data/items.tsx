import {
    EquipmentSlot,
    IEquipmentItem,
    equipmentSlotTypes,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/equipment-item';
import { WeaveDataRoute } from './data';

export class WeaveItems extends WeaveDataRoute {
    constructor() {
        super('/items');
    }

    getEquipmentItemInfo = async (
        slot: EquipmentSlot,
    ): Promise<IEquipmentItem[]> => {
        const types = equipmentSlotTypes[slot];

        const keyed: Record<string, IEquipmentItem[]> = await this.fetchFromApi(
            `/equipment?types=${types.join(',')}`,
        );

        return Object.values(keyed).flat();
    };

    getEquipmentItemInfoById = async (id: number): Promise<IEquipmentItem> => {
        const item: IEquipmentItem = await this.fetchFromApi(
            `/equipment/${id}`,
        );

        return item;
    };
}
