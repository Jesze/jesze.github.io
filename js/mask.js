var xsize = 100, ysize = 100;
var leavex, leavey;
var shrink;

$('.model')
.mousemove(function(e)
{
	var offs = $(this).offset(),
		p    = {x:offs.left, y:offs.top},
		mPos = {x:e.pageX, y:e.pageY},
		x    = mPos.x - p.x - xsize,
		y    = mPos.y - p.y - ysize;

	$('.gray', this).css({left:x, top:y, backgroundPosition: -x+'px '+-y+'px', width:xsize*2, height:ysize*2});
    
})
.mouseleave(function(p)
{	
	leavex = p.pageX;
	leavey = p.pageY;
	shrink = setInterval(shrinkCircle,5);
})

.mouseenter(function(p)
{
	clearInterval(shrink);
	xsize = 100;
	ysize = 100;
});

function shrinkCircle()
{
	xsize--;
	ysize--;
	var offs = $('.model').offset(),
		p    = {x:offs.left, y:offs.top},
		mPos = {x:leavex, y:leavey},
		x    = mPos.x - p.x - xsize,
		y    = mPos.y - p.y - ysize;

	$('.gray', '.model').css({left:x, top:y, backgroundPosition: -x+'px '+-y+'px', width:xsize*2, height:ysize*2});	
}