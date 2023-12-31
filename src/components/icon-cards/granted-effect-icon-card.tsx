import { CardActionArea, CardMedia } from '@mui/material';
import React, { RefObject, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { GrantableEffect } from '@jorgenswiderski/tomekeeper-shared/dist/types/grantable-effect';
import { WeaveImages } from '../../api/weave/weave-images';
import { StyledIconCard } from './styled-icon-card';
import { GrantedEffectTooltip } from '../tooltips/granted-effect-tooltip';

const ActionArea = styled(CardActionArea)`
    position: relative;
    height: 100%;
`;

interface SpellCardMediaProps {
    effect?: GrantableEffect;
    containerRef: RefObject<HTMLDivElement>;
}

function EffectCardMedia({ effect, containerRef }: SpellCardMediaProps) {
    const [path, setPath] = useState<string>();

    useEffect(() => {
        if (effect?.image) {
            setPath(WeaveImages.getPath(effect.image, containerRef));
        }
    }, [effect?.image, containerRef]);

    return path && <CardMedia component="img" image={path} />;
}

interface GrantedEffectIconCardProps {
    effect: GrantableEffect;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    selected?: boolean;
    elevation?: number;
}

export function GrantedEffectIconCard({
    effect,
    onClick,
    selected = false,
    elevation = 3,
}: GrantedEffectIconCardProps) {
    const imageContainerRef = useRef<HTMLDivElement>(null);

    return (
        <GrantedEffectTooltip effect={effect}>
            <StyledIconCard
                elevation={elevation}
                selected={selected}
                ref={imageContainerRef}
            >
                {effect && onClick ? (
                    <ActionArea onClick={onClick}>
                        {imageContainerRef.current && (
                            <EffectCardMedia
                                effect={effect}
                                containerRef={imageContainerRef}
                            />
                        )}
                    </ActionArea>
                ) : (
                    <EffectCardMedia
                        effect={effect}
                        containerRef={imageContainerRef}
                    />
                )}
            </StyledIconCard>
        </GrantedEffectTooltip>
    );
}
