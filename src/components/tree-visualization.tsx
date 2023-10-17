/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styled from '@emotion/styled';
import { CharacterTreeNodeType } from '../models/character/character-tree-node/types';

interface TreeNode {
    name: string;
    children?: TreeNode[];
    nodeType: CharacterTreeNodeType;
}

interface TreeLayoutNode<Datum> extends d3.HierarchyNode<Datum> {
    x: number;
    y: number;
}

interface TreeLayoutLink<Datum> extends d3.HierarchyLink<Datum> {
    source: TreeLayoutNode<Datum>;
    target: TreeLayoutNode<Datum>;
}

interface TreeVisualizationProps {
    data: TreeNode;
}

const StyledSVG = styled.svg`
    background-color: #f5f5f5;
`;

const linkStyle = {
    stroke: '#2c3e50',
    strokeWidth: '2px',
};

export default function TreeVisualization({ data }: TreeVisualizationProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Clear previous rendering
        d3.select(svgRef.current).selectAll('*').remove();

        const margin = { top: 20, right: 40, bottom: 240, left: 40 };
        const svgWidth = 1400;
        const svgHeight = 900;
        const width = svgWidth - margin.top - margin.bottom;
        const height = svgHeight - margin.left - margin.right;

        const svg = d3.select(svgRef.current);

        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        const root = d3.hierarchy(data);
        const treeLayout = d3.tree<TreeNode>().size([height, width]); // Swap width and height for 90° rotation
        treeLayout(root);

        const nodes = g
            .selectAll('.node')
            .data(root.descendants() as TreeLayoutNode<TreeNode>[])
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('r', 5)
            .attr('cx', (d) => d.y) // Use y for x due to 90° rotation
            .attr('cy', (d) => d.x) // Use x for y due to 90° rotation
            .attr('fill', (d) => {
                if (d.data.nodeType === CharacterTreeNodeType.DECISION) {
                    return 'blue';
                }

                if (d.data.nodeType === CharacterTreeNodeType.EFFECT) {
                    return 'red';
                }

                if (d.data.nodeType === CharacterTreeNodeType.ROOT) {
                    return 'green';
                }

                return '#3498db';
            })
            .attr('stroke', '#2980b9')
            .attr('stroke-width', '1.5px')
            .append('title')
            .text((d) => JSON.stringify(d.data, null, 2));

        const nodeLabels = g
            .selectAll('.node-label')
            .data(root.descendants() as TreeLayoutNode<TreeNode>[])
            .enter()
            .append('text')
            .attr('class', 'node-label')
            .attr('x', (d) => d.y - 20) // Use y for x due to 90° rotation
            .attr('y', (d) => d.x + 30) // Use x for y due to 90° rotation
            .text((d) => d.data.name);

        const links = g
            .selectAll('.link')
            .data(root.links() as TreeLayoutLink<TreeNode>[])
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', linkStyle.stroke)
            .attr('stroke-width', linkStyle.strokeWidth)
            .attr('x1', (d) => d.source.y) // Use source's y for x1 due to 90° rotation
            .attr('y1', (d) => d.source.x) // Use source's x for y1 due to 90° rotation
            .attr('x2', (d) => d.target.y) // Use target's y for x2 due to 90° rotation
            .attr('y2', (d) => d.target.x); // Use target's x for y2 due to 90° rotation
    }, [data]);

    return <StyledSVG ref={svgRef} width="1400" height="900" />;
}
