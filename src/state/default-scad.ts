// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

export default `// Stackable Sorting Trays by Benjamin Kott
//
// Author: https://makerworld.com/en/@benjaminkott
// Link: https://makerworld.com/en/models/476243
//
// License: CC BY-NC-ND 4.0 DEED
//          https://creativecommons.org/licenses/by-nc-nd/4.0/
// Copyright (c) 2024 Benjamin Kott, http://www.bk2k.info

/*[Dimensions]*/
// Length in mm
length=160; // [80:10:300]
// Width in mm
width=160;  // [80:10:300]
// Height in mm
height=20;  // [10:10:300]
// Radius in mm, be aware that the radius can be lower, depending on rows and columns.
radius=10;  // [10, 20, 30]

/*[Columns and Rows]*/
// Columns
columns=2; // [1:6]
// Rows
rows=3;    // [1:6]

/*[First Cell]*/
// Column spanning of the first cell
colspan=2; // [1:6]
// Row spanning of the first cell
rowspan=2; // [1:6]

/* [Hidden] */
champfer=2;
wall=2;
$fs = 0.1;
$fa = 5;

translate([- (length / 2), - (width / 2), 0])
tray(
    length = length, 
    width = width, 
    height = height,
    radius = radius,
    columns = columns,
    rows = rows,
    champfer = champfer
);

module tray(length, width, height, radius, columns, rows, champfer)
{
    innerLength = length - wall * 3;
    innerWidth = width - wall * 3;
    innerHeight = height;

    cellLength = innerLength / rows;
    cellWidth = innerWidth / columns;
    cellHeight = innerHeight;

    bestRadius = min(
        cellLength / 2,
        cellWidth / 2,
        radius
    );

    bestFillet = min(
        cellLength / 2,
        cellWidth / 2,
        min(champfer * 2, bestRadius / 2)
    );

    difference() {
        // base
        __shapeWithChampfer(
            length, 
            width, 
            height, 
            bestRadius, 
            champfer
        );

        // cells
        for (iterationColumns = [0 : 1 : columns - 1]) {
            for (iterationRows = [0 : 1 : rows - 1]) {
                currentX = cellLength * iterationRows;
                currentY = cellWidth * iterationColumns;
                translate([
                    currentX + wall * 2,
                    currentY + wall * 2,
                    wall
                ])
                __shapeWithFillet(
                    cellLength - wall,
                    cellWidth - wall,
                    cellHeight,
                    max(bestRadius - wall * 2, 0),
                    max(bestFillet, 0)
                );
            }
        }

        // spanned cell
        appliedRowspan = min(rows, rowspan);
        appliedColspan = min(columns, colspan);
        translate([
            wall * 2,
            wall * 2,
            wall
        ])
        __shapeWithFillet(
            cellLength * appliedRowspan - wall,
            cellWidth * appliedColspan - wall,
            cellHeight,
            max(bestRadius - wall * 2, 0),
            max(bestFillet, 0)
        );

        // top champfered edge
        translate([0, 0, height - wall / 2])
        __shapeWithChampfer(length, width, champfer, bestRadius, champfer);
    }
}

module __shapeWithChampfer(
    length=160,
    width=120,
    height=40,
    radius=10,
    champfer=4,
    flip=false
)
{
    start1 = (flip == true) ? height - champfer : 0;
    start2 = (flip == true) ? 0 : champfer;
    translate([0, 0, start1])
    __champfer(length, width, champfer, radius, flip); 
    translate([0, 0, start2])
    __shape(length, width, height - champfer, radius);
}

module __shapeWithFillet(
    length=160,
    width=120,
    height=40,
    radius=10,
    fillet=4,
    flip=false
)
{
    fillet_size = min(fillet, radius / 2);
    start1 = (flip == true) ? height - fillet_size : 0;
    start2 = (flip == true) ? 0 : fillet_size;
    hull() {
        translate([0, 0, start1])
        __fillet(length, width, fillet_size, radius, flip); 
        translate([0, 0, start2])
        __shape(length, width, height - champfer, radius);
    }
}

module __fillet (
    length=160,
    width=120,
    size=4,
    radius=10,
    flip=false
) {
    start_fillet = (flip == true) ? 0 : size;
    start_cutout = (flip == true) ? - size - 1: size;

    difference() {
        translate([0,0,start_fillet])
        hull () {
            rotate(180)
            translate ([- radius, - radius, 0])
            rotate_extrude(angle = 90)
            translate([radius - size, 0, 0])
            circle(r = size, $fn = 100);

            rotate(90)
            translate ([width - radius, - radius, 0])
            rotate_extrude(angle = 90)
            translate([radius - size, 0, 0])
            circle(r = size, $fn = 100);

            rotate(0)
            translate ([length - radius, width - radius, 0])
            rotate_extrude(angle = 90)
            translate([radius - size, 0, 0])
            circle(r = size, $fn = 100);

            rotate(270)
            translate ([- radius, length - radius, 0])
            rotate_extrude(angle = 90)
            translate([radius - size, 0, 0])
            circle(r = size, $fn = 100);
        }

        translate([0,0,start_cutout])
        hull() {
            translate ([radius, radius, 0]) cylinder (h = size + 1, r=radius);
            translate ([radius, width-radius, 0]) cylinder (h = size + 1, r=radius);
            translate ([length-radius,width-radius, 0]) cylinder (h = size + 1, r=radius);
            translate ([length-radius, radius, 0]) cylinder (h = size + 1, r=radius);
        }
    }
}

module __champfer (
    length=160,
    width=120,
    size=4,
    radius=10,
    flip=false
) {
    r1 = (flip == true) ? radius : radius - size;
    r2 = (flip == true) ? radius - size : radius;
    hull() {
        translate ([radius, radius, 0]) cylinder (h = size, r1=r1, r2=r2);
        translate ([radius, width-radius, 0]) cylinder (h = size, r1=r1, r2=r2);
        translate ([length-radius,width-radius, 0]) cylinder (h = size, r1=r1, r2=r2);
        translate ([length-radius, radius, 0]) cylinder (h = size, r1=r1, r2=r2);
    }
}

module __shape(
    length=160,
    width=120,
    height=40,
    radius=10,
){
    hull() {
        translate ([radius, radius, 0]) cylinder (h = height, r=radius);
        translate ([radius, width-radius, 0]) cylinder (h = height, r=radius);
        translate ([length-radius,width-radius, 0]) cylinder (h = height, r=radius);
        translate ([length-radius, radius, 0]) cylinder (h = height, r=radius);
    }
}
`